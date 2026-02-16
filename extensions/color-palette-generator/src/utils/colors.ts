import {
  AlgorithmType,
  CMYK,
  Color,
  ColorBlindnessType,
  HSL,
  HSV,
  HWB,
  LAB,
  LCH,
  LUV,
  OKLCH,
  Palette,
  RGB,
  XYZ,
} from "../types";
import { getColorName } from "./color-names";

// ==========================================
// Color Conversions (Pure Math)
// ==========================================

export function hexToRgb(hex: string): RGB {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  let r, g, b;

  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  let c = 0;
  let m = 0;
  let y = 0;
  let k = 0;

  r = r / 255;
  g = g / 255;
  b = b / 255;

  k = Math.min(1 - r, 1 - g, 1 - b);
  if (k !== 1) {
    c = (1 - r - k) / (1 - k);
    m = (1 - g - k) / (1 - k);
    y = (1 - b - k) / (1 - k);
  } else {
    c = m = y = 0;
  }

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function rgbToXyz(r: number, g: number, b: number): XYZ {
  let rN = r / 255;
  let gN = g / 255;
  let bN = b / 255;

  rN = rN > 0.04045 ? Math.pow((rN + 0.055) / 1.055, 2.4) : rN / 12.92;
  gN = gN > 0.04045 ? Math.pow((gN + 0.055) / 1.055, 2.4) : gN / 12.92;
  bN = bN > 0.04045 ? Math.pow((bN + 0.055) / 1.055, 2.4) : bN / 12.92;

  rN *= 100;
  gN *= 100;
  bN *= 100;

  const x = rN * 0.4124 + gN * 0.3576 + bN * 0.1805;
  const y = rN * 0.2126 + gN * 0.7152 + bN * 0.0722;
  const z = rN * 0.0193 + gN * 0.1192 + bN * 0.9505;

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    z: Math.round(z * 100) / 100,
  };
}

export function rgbToLab(r: number, g: number, b: number): LAB {
  const { x, y, z } = rgbToXyz(r, g, b);

  // Observer= 2°, Illuminant= D65
  const xRef = 95.047;
  const yRef = 100.0;
  const zRef = 108.883;

  let xN = x / xRef;
  let yN = y / yRef;
  let zN = z / zRef;

  xN = xN > 0.008856 ? Math.pow(xN, 1 / 3) : 7.787 * xN + 16 / 116;
  yN = yN > 0.008856 ? Math.pow(yN, 1 / 3) : 7.787 * yN + 16 / 116;
  zN = zN > 0.008856 ? Math.pow(zN, 1 / 3) : 7.787 * zN + 16 / 116;

  const l = 116 * yN - 16;
  const a = 500 * (xN - yN);
  const bVal = 200 * (yN - zN);

  return {
    l: Math.round(l * 100) / 100,
    a: Math.round(a * 100) / 100,
    b: Math.round(bVal * 100) / 100,
  };
}

export function rgbToLch(r: number, g: number, b: number): LCH {
  const { l, a, b: bVal } = rgbToLab(r, g, b);
  const c = Math.sqrt(a * a + bVal * bVal);
  let h = Math.atan2(bVal, a) * (180 / Math.PI);

  if (h < 0) h += 360;

  return {
    l: Math.round(l * 100) / 100,
    c: Math.round(c * 100) / 100,
    h: Math.round(h * 100) / 100,
  };
}

export function rgbToHwb(r: number, g: number, b: number): HWB {
  const { h } = rgbToHsl(r, g, b);
  const w = (Math.min(r, g, b) / 255) * 100;
  const bl = (1 - Math.max(r, g, b) / 255) * 100;

  return {
    h: Math.round(h),
    w: Math.round(w),
    b: Math.round(bl),
  };
}

export function rgbToLuv(r: number, g: number, b: number): LUV {
  const { x, y, z } = rgbToXyz(r, g, b);

  // D65 reference white
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;

  const u_ = (4 * x) / (x + 15 * y + 3 * z);
  const v_ = (9 * y) / (x + 15 * y + 3 * z);

  const un_ = (4 * Xn) / (Xn + 15 * Yn + 3 * Zn);
  const vn_ = (9 * Yn) / (Xn + 15 * Yn + 3 * Zn);

  const yr = y / Yn;
  const L = yr > 0.008856 ? 116 * Math.pow(yr, 1 / 3) - 16 : 903.3 * yr;

  const u = 13 * L * (u_ - un_);
  const v = 13 * L * (v_ - vn_);

  return {
    l: Math.round(L * 100) / 100,
    u: Math.round(u * 100) / 100,
    v: Math.round(v * 100) / 100,
  };
}

export function rgbToOklch(r: number, g: number, b: number): OKLCH {
  // Normalized RGB
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  // Linear RGB
  const rL = rN > 0.04045 ? Math.pow((rN + 0.055) / 1.055, 2.4) : rN / 12.92;
  const gL = gN > 0.04045 ? Math.pow((gN + 0.055) / 1.055, 2.4) : gN / 12.92;
  const bL = bN > 0.04045 ? Math.pow((bN + 0.055) / 1.055, 2.4) : bN / 12.92;

  // LMS
  const l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
  const m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
  const s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // OKLCH
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const C = Math.sqrt(
    Math.pow(1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_, 2) +
      Math.pow(0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_, 2),
  );
  let H = Math.atan2(
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
  );

  H = H * (180 / Math.PI);
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 1000) / 1000,
    c: Math.round(C * 1000) / 1000,
    h: Math.round(H * 10) / 10,
  };
}

export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ==========================================
// Validation
// ==========================================

export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-F]{3}){1,2}$/i.test(hex);
}

// ==========================================
// Color Analysis & Psychology
// ==========================================

export function getColorMeaning(hex: string): string {
  const { h, s, l } = hexToHsl(hex);

  if (l < 10) return "Mystery, elegance, and power. Creates depth and infinite space."; // Black/Dark
  if (l > 90) return "Purity, cleanliness, and neutrality. Opens up space and adds breath."; // White/Light
  if (s < 10) return "Balance, calm, and neutrality. A solid foundation."; // Grey

  if (h >= 0 && h < 15) return "Passion, energy, and excitement. Grabs attention immediately."; // Red
  if (h >= 15 && h < 45) return "Warmth, creativity, and enthusiasm. Invites interaction."; // Orange
  if (h >= 45 && h < 70) return "Optimism, clarity, and happiness. Radiates light."; // Yellow
  if (h >= 70 && h < 160) return "Nature, growth, and restoration. Soothes the eye."; // Green
  if (h >= 160 && h < 200) return "Calm, trust, and intelligence. Promotes clear thinking."; // Cyan/Teal
  if (h >= 200 && h < 260) return "Trust, stability, and depth. The favorite color of the mind."; // Blue
  if (h >= 260 && h < 300) return "Luxury, wisdom, and imagination. Intriguing and magical."; // Purple
  if (h >= 300 && h < 340) return "Romance, kindness, and playfulness. Soft yet bold."; // Pink
  return "Passion, energy, and excitement. Grabs attention immediately."; // Red loop
}

// ==========================================
// Color Manipulation
// ==========================================

// Helper to create a Color object from HSL
function createColorFromHsl(h: number, s: number, l: number): Color {
  // Clamp values
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));

  const hex = hslToHex(h, s, l);
  const rgb = hslToRgb(h, s, l);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const lch = rgbToLch(rgb.r, rgb.g, rgb.b);
  const hwb = rgbToHwb(rgb.r, rgb.g, rgb.b);
  const luv = rgbToLuv(rgb.r, rgb.g, rgb.b);

  const name = getColorName(hex);
  const meaning = getColorMeaning(hex);

  return {
    hex,
    rgb,
    hsl: { h, s, l },
    hsv,
    cmyk,
    lab,
    oklch,
    xyz,
    lch,
    hwb,
    luv,
    name,
    meaning,
  };
}

// ==========================================
// Color Blindness Simulation
// ==========================================

export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
  const { r, g, b } = hexToRgb(hex);

  // Simulations based on LMS Daltonization algorithms
  // These are simplified matrix approximations
  let R = r,
    G = g,
    B = b;

  if (type === "protanopia") {
    R = 0.567 * r + 0.433 * g + 0 * b;
    G = 0.558 * r + 0.442 * g + 0 * b;
    B = 0 * r + 0.242 * g + 0.758 * b;
  } else if (type === "deuteranopia") {
    R = 0.625 * r + 0.375 * g + 0 * b;
    G = 0.7 * r + 0.3 * g + 0 * b;
    B = 0 * r + 0.3 * g + 0.7 * b;
  } else if (type === "tritanopia") {
    R = 0.95 * r + 0.05 * g + 0 * b;
    G = 0 * r + 0.433 * g + 0.567 * b;
    B = 0 * r + 0.475 * g + 0.525 * b;
  } else if (type === "achromatopsia") {
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    R = G = B = grey;
  }

  return rgbToHex(Math.min(255, R), Math.min(255, G), Math.min(255, B));
}

// ==========================================
// Palette Algorithms
// ==========================================

export function generateMonochromatic(baseColor: HSL, count: number = 5): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const l = 10 + (80 / Math.max(1, count - 1)) * i;
    colors.push(createColorFromHsl(baseColor.h, baseColor.s, l));
  }
  return colors;
}

export function generateAnalogous(baseColor: HSL, count: number = 5): Color[] {
  const colors: Color[] = [];
  const step = 30;
  const start = baseColor.h - Math.floor(count / 2) * step;
  for (let i = 0; i < count; i++) {
    colors.push(createColorFromHsl(start + i * step, baseColor.s, baseColor.l));
  }
  return colors;
}

export function generateComplementary(baseColor: HSL, count: number = 5): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const isBase = i % 2 === 0;
    const hue = isBase ? baseColor.h : baseColor.h + 180;
    const l = baseColor.l + Math.floor(i / 2) * (isBase ? 10 : -10);
    colors.push(createColorFromHsl(hue, baseColor.s, Math.max(10, Math.min(90, l))));
  }
  return colors;
}

export function generateTriadic(baseColor: HSL, count: number = 5): Color[] {
  const colors: Color[] = [];
  const hues = [0, 120, 240];
  for (let i = 0; i < count; i++) {
    const hueOffset = hues[i % 3];
    const l = baseColor.l + Math.floor(i / 3) * 10;
    colors.push(createColorFromHsl(baseColor.h + hueOffset, baseColor.s, Math.max(10, Math.min(90, l))));
  }
  return colors;
}

export function generateSplitComplementary(baseColor: HSL, count: number = 5): Color[] {
  const colors: Color[] = [];
  const hues = [0, 150, 210]; // Base, Split 1, Split 2
  for (let i = 0; i < count; i++) {
    const hueOffset = hues[i % 3];
    const l = baseColor.l + Math.floor(i / 3) * 10;
    colors.push(createColorFromHsl(baseColor.h + hueOffset, baseColor.s, Math.max(10, Math.min(90, l))));
  }
  return colors;
}

// USE CASES

export function generateWebTheme(baseColor: HSL): Color[] {
  const primary = createColorFromHsl(baseColor.h, baseColor.s, baseColor.l);
  primary.name = "Primary";

  const secondary = createColorFromHsl(baseColor.h + 180, Math.max(baseColor.s, 40), 50);
  secondary.name = "Secondary";

  const text = createColorFromHsl(210, 20, 10); // Dark Blue-Grey
  text.name = "Text Main";

  const textLight = createColorFromHsl(210, 15, 40);
  textLight.name = "Text Muted";

  const background = createColorFromHsl(210, 10, 98); // Very light grey
  background.name = "Background";

  const surface = createColorFromHsl(210, 10, 95);
  surface.name = "Surface";

  const success = createColorFromHsl(140, 70, 45); // Green
  success.name = "Success";

  const danger = createColorFromHsl(0, 80, 55); // Red
  danger.name = "Danger";

  return [primary, secondary, text, textLight, background, surface, success, danger];
}

export function generateAppTheme(baseColor: HSL): Color[] {
  const brand = createColorFromHsl(baseColor.h, baseColor.s, baseColor.l);
  brand.name = "Brand";

  const brandLight = createColorFromHsl(baseColor.h, baseColor.s, Math.min(95, baseColor.l + 20));
  brandLight.name = "Brand Light";

  const brandDark = createColorFromHsl(baseColor.h, baseColor.s, Math.max(10, baseColor.l - 20));
  brandDark.name = "Brand Dark";

  const accent = createColorFromHsl(baseColor.h + 30, 90, 60);
  accent.name = "Accent";

  const surface1 = createColorFromHsl(baseColor.h, 5, 98);
  surface1.name = "Surface 1";

  const surface2 = createColorFromHsl(baseColor.h, 10, 95);
  surface2.name = "Surface 2";

  return [brand, brandLight, brandDark, accent, surface1, surface2];
}

export function generateDashboardTheme(baseColor: HSL): Color[] {
  // Data Visualization focus
  const colors: Color[] = [];

  // 5 distinct colors for charts
  for (let i = 0; i < 5; i++) {
    const c = createColorFromHsl((baseColor.h + i * 72) % 360, 70, 60);
    c.name = `Chart ${i + 1}`;
    colors.push(c);
  }

  // Neutrals
  const bg = createColorFromHsl(220, 15, 97);
  bg.name = "Background";
  colors.push(bg);

  const border = createColorFromHsl(220, 10, 85);
  border.name = "Border";
  colors.push(border);

  const text = createColorFromHsl(220, 20, 20);
  text.name = "Text";
  colors.push(text);

  return colors;
}

export function generateMarketingTheme(baseColor: HSL): Color[] {
  // High impact, vibrant
  const dominant = createColorFromHsl(baseColor.h, 90, 50);
  dominant.name = "Hero Dominant";

  const contrast = createColorFromHsl(baseColor.h + 180, 90, 50);
  contrast.name = "Call to Action";

  const dark = createColorFromHsl(baseColor.h, 40, 10);
  dark.name = "Dark Section";

  const light = createColorFromHsl(baseColor.h, 10, 98);
  light.name = "Light Section";

  return [dominant, contrast, dark, light];
}

export function generatePalette(baseHex: string, algorithm: AlgorithmType, count: number = 5): Color[] {
  if (!isValidHex(baseHex)) return [];

  const hsl = hexToHsl(baseHex);

  switch (algorithm) {
    case "monochromatic":
      return generateMonochromatic(hsl, count);
    case "analogous":
      return generateAnalogous(hsl, count);
    case "complementary":
      return generateComplementary(hsl, count);
    case "triadic":
      return generateTriadic(hsl, count);
    case "split-complementary":
      return generateSplitComplementary(hsl, count);
    // Use Cases
    case "web":
      return generateWebTheme(hsl);
    case "app":
      return generateAppTheme(hsl);
    case "dashboard":
      return generateDashboardTheme(hsl);
    case "marketing":
      return generateMarketingTheme(hsl);
    default:
      return generateMonochromatic(hsl, count);
  }
}

// ==========================================
// String Helpers
// ==========================================

export function splitCamelCase(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, "$1 $2");
}

// ==========================================
// Single Color Variations (Harmonies & Shades)
// ==========================================

export function getHarmonies(color: Color): { [key: string]: Color[] } {
  const { h, s, l } = color.hsl;

  return {
    Analogous: generateAnalogous({ h, s, l }, 5).slice(1), // Exclude original
    Complementary: generateComplementary({ h, s, l }, 2).slice(1),
    "Split Complementary": generateSplitComplementary({ h, s, l }, 3).slice(1),
    Triadic: generateTriadic({ h, s, l }, 3).slice(1),
    Monochromatic: generateMonochromatic({ h, s, l }, 5).slice(1),
  };
}

export function getShadesAndTints(color: Color): { shades: Color[]; tints: Color[]; tones: Color[] } {
  const { h, s, l } = color.hsl;
  const shades: Color[] = [];
  const tints: Color[] = [];
  const tones: Color[] = [];

  // Shades (Darker)
  for (let i = 1; i <= 5; i++) {
    shades.push(createColorFromHsl(h, s, Math.max(0, l - i * 10)));
  }

  // Tints (Lighter)
  for (let i = 1; i <= 5; i++) {
    tints.push(createColorFromHsl(h, s, Math.min(100, l + i * 10)));
  }

  // Tones (Desaturated)
  for (let i = 1; i <= 5; i++) {
    tones.push(createColorFromHsl(h, Math.max(0, s - i * 15), l));
  }

  return { shades, tints, tones };
}

// ==========================================
// Exports
// ==========================================

export function toCssVariables(palette: Palette): string {
  let css = `:root {\n`;
  palette.colors.forEach((color, index) => {
    const name = color.name
      ? color.name.toLowerCase().replace(/\s+/g, "-")
      : index === 2
        ? "base"
        : `shade-${index + 1}`;
    css += `  --color-${palette.id}-${name}: ${color.hex};\n`;
  });
  css += `}`;
  return css;
}

export function toTailwindConfig(palette: Palette): string {
  let output = `${palette.name.toLowerCase().replace(/\s+/g, "-")}: {\n`;
  palette.colors.forEach((color, index) => {
    const key = color.name ? color.name.toLowerCase().replace(/\s+/g, "") : index * 100 + 50;
    output += `    '${key}': '${color.hex}',\n`;
  });
  output += `  },`;
  return output;
}

export function toJSON(palette: Palette): string {
  return JSON.stringify(palette, null, 2);
}
export function createColor(hex: string): Color {
  const rgb = hexToRgb(hex);

  // Conversions
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const lch = rgbToLch(rgb.r, rgb.g, rgb.b);
  const hwb = rgbToHwb(rgb.r, rgb.g, rgb.b);
  const luv = rgbToLuv(rgb.r, rgb.g, rgb.b);
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    name: getColorName(hex),
    meaning: getColorMeaning(hex),
    rgb,
    hsl,
    hsv,
    cmyk,
    lab,
    xyz,
    lch,
    hwb,
    luv,
    oklch,
  };
}
