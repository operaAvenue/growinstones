// Made with VFX-JS
// https://amagi.dev/vfx-js/
import { VFX } from "https://esm.sh/@vfx-js/core@0.8.0";

// Global configuration object with default parameters
window.VFX_CONFIG = window.VFX_CONFIG || {
  vignette: 1.8,
  scanlineSpeed: 100.0,
  scanlineOpacity: 0.05,
  chromaticAberration: 0.05,
  dither: 0.1,
  gridIntensity: 0.1,
  glitchFreq: 0.8,
  glitchInt: 0.03,
  curvature: 0.3,
  zoom: 0.5,
  blur: 0.3,
  gridScale: 20.0,
};

const shader = `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;

// Dynamic Uniforms
uniform float uVignette;
uniform float uScanlineSpeed;
uniform float uScanlineOpacity;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uGridIntensity;
uniform float uCurvature;
uniform float uZoom;
uniform float uBlur;
uniform float uGridScale;

out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));  // smooth edge
  return c;
}

vec2 zoom(vec2 uv, float t) {
  return (uv - .5) * t + .5;
}
float wave(float y, float t) {
  return sin(y * 1190. + t * 3.) * sin(y * 1001. + t * 7.) * sin(y * 1479. + t * .5) * 0.001;
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

void main() {
  float t = mod(time, 300.0);
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;       
  
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  float l = length(p); 
   
  // distort / curvature
  float dist = pow(l, 2.) * uCurvature;
  dist = smoothstep(0., 1., dist);
  uv = zoom(uv, uZoom + dist);  
    
  // radial blur
  vec2 du = (uv - .5);
  float a = atan(p.y, p.x);
  float rd = rand(vec3(a, t, 0));
  uv = (uv - .5) * (1.0 + rd * pow(l * 0.7, 3.) * uBlur) + .5;
    
  vec2 uvr = uv;
  vec2 uvg = uv;
  vec2 uvb = uv;
    
  // aberration
  float d = (1. + sin(uv.y * 20. + t * 3.) * 0.1) * uChromaticAberration;
  uvr.x += 0.0015;
  uvb.x -= 0.0015;
  uvr = zoom(uvr, 1. + d * l * l);
  uvb = zoom(uvb, 1. - d * l * l);    
    
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);

  
  vec4 deco = vec4(0.0);

  // scanline
  float res = resolution.y;
  deco += (
    sin(uv.y * res * .7 + t * uScanlineSpeed) *
    sin(uv.y * res * .3 - t * (uScanlineSpeed * 1.3))
  ) * uScanlineOpacity;

  // grid
  deco += smoothstep(.01, .0, min(fract(uv.x * uGridScale), fract(uv.y * uGridScale))) * uGridIntensity;

  outColor += deco * smoothstep(2., 0., l);
  
  // vignette
  outColor *= uVignette - l * l;  

  // dither
  outColor += rand(vec3(p, t)) * uDither;     
}
`;

const shader2 = `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform float id;

// Dynamic Uniforms
uniform float uGlitchFreq;
uniform float uGlitchInt;

out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));  // smooth edge
  return c;
}

float rand(vec2 p) {
  return fract(sin(dot(p, vec2(829., 483.))) * 394.);
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

vec2 dist(vec2 uv, float f, float t) {
  uv += sin(uv.y * 12. + t * 1.7) * sin(uv.y * 17. + t * 2.3) * f;
  return uv;
}

void main() {
  float t = mod(time, 300.0);
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  vec2 uvr = uv, uvg = uv, uvb = uv;

  float r = rand(vec2(floor(t * 43.), id));
  if (r > uGlitchFreq) {
    float y = sin(floor(uv.y / 0.07)) + sin(floor(uv.y / 0.003 + t));
    float f = rand(vec2(y, floor(t * 5.0) + id)) * 2. - 1.;
    uvr.x += f * (uGlitchInt * 3.33);
    uvg.x += f * (uGlitchInt * 6.66);
    uvb.x += f * (uGlitchInt * 10.0);
  }
  
  float r2 = rand(vec2(floor(t * 37.), id + 10.));
  if (r2 > 0.9) {
    uvr.x += sin(uv.y * 7. + t + id + 1.) * uGlitchInt;
    uvg.x += sin(uv.y * 5. + t + id + 2.) * uGlitchInt;
    uvb.x += sin(uv.y * 3. + t + id + 3.) * uGlitchInt;
  }
  
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);
}
`;

const vfx = new VFX({ 
  scrollPadding: false,
  postEffect: { 
    shader,
    uniforms: {
      uVignette: () => window.VFX_CONFIG.vignette,
      uScanlineSpeed: () => window.VFX_CONFIG.scanlineSpeed,
      uScanlineOpacity: () => window.VFX_CONFIG.scanlineOpacity,
      uChromaticAberration: () => window.VFX_CONFIG.chromaticAberration,
      uDither: () => window.VFX_CONFIG.dither,
      uGridIntensity: () => window.VFX_CONFIG.gridIntensity,
      uCurvature: () => window.VFX_CONFIG.curvature,
      uZoom: () => window.VFX_CONFIG.zoom,
      uBlur: () => window.VFX_CONFIG.blur,
      uGridScale: () => window.VFX_CONFIG.gridScale,
    }
  } 
});

window.addEventListener('load', async function () {
  // Wait for all Google Fonts / Web Fonts to be fully loaded
  if (document.fonts) {
    await document.fonts.ready;
  }

  let i = 0;
  for (const e of document.querySelectorAll('img,h1,h2,h6,p')) {
    const z = e.getAttribute('data-z');
    vfx.add(e, { 
      shader: shader2,
      uniforms: { 
        id: i++,
        uGlitchFreq: () => window.VFX_CONFIG.glitchFreq,
        uGlitchInt: () => window.VFX_CONFIG.glitchInt,
      },
      zIndex: z ? parseInt(z) : 0,
    });
  }    
})
