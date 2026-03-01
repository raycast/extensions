import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  basePixel?: string;
}

const loadBasePixelsFromPreferences = () => {
  const basePixel =
    getPreferenceValues<Preferences>().basePixel === "" ? 16 : Number(getPreferenceValues<Preferences>().basePixel);
  if (isNaN(basePixel)) {
    return 16;
  }
  return basePixel;
};

const BASE_FONT_PIXELS = loadBasePixelsFromPreferences();

export const REMtoPX = (rem: number) => rem * BASE_FONT_PIXELS;

export const REMtoPT = (rem: number): number => rem * 12;

export const PXtoREM = (px: number): number => px / BASE_FONT_PIXELS;

export const PXtoPT = (px: number): number => px * 0.75;

export const PTtoREM = (pt: number): number => pt / 12;

export const PTtoPX = (pt: number): number => pt / 0.75;

export const HEXtoRGB = (hex: string): number[] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$|^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i.exec(hex);

  return result
    ? [
        parseInt(result[1] ?? result[4] + result[4], 16),
        parseInt(result[2] ?? result[5] + result[5], 16),
        parseInt(result[3] ?? result[6] + result[6], 16),
      ]
    : [0, 0, 0];
};

export const HEXtoRGBA = (hex: string): number[] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        Math.round((parseInt(result[4], 16) / 255) * 100) / 100,
      ]
    : [0, 0, 0, 0];
};

export const HEXtoHSL = (hex: string): number[] => {
  // Check if the input is a shorthand hex string
  if (hex.length === 4) {
    // Expand the shorthand string to a full hex string
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  const match = hex.match(/\w\w/g);
  if (!match) return [];

  // Convert the hex string to an RGB array
  let [r, g, b] = match.map((x) => parseInt(x, 16));

  // Normalize the RGB values
  r /= 255;
  g /= 255;
  b /= 255;

  // Find the minimum and maximum RGB values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Initialize the HSL values
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  // Calculate the HSL values
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

  // Format the HSL values to CSS syntax
  h = Number(Math.round((h * 360) % 360));
  s = Number(Math.round(s * 100));
  l = Number(Math.round(l * 100));

  // Return the HSL values as a number array
  return [h, s, l];
};

export const HEXtoHSLA = (hex: string): number[] => {
  const rgba = HEXtoRGBA(hex);
  const r = (rgba[0] /= 255);
  const g = (rgba[1] /= 255);
  const b = (rgba[2] /= 255);
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s ? (l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s) : 0;
  return [
    Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
    Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
    Math.round((100 * (2 * l - s)) / 2),
    rgba[3],
  ];
};

export const RGBtoHEX = (rgb: number[]): string => `#${rgb.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

// export const RGBtoHSL = (rgb: number[]): number[] => {
//   const r = (rgb[0] /= 255);
//   const g = (rgb[1] /= 255);
//   const b = (rgb[2] /= 255);
//   const l = Math.max(r, g, b);
//   const s = l - Math.min(r, g, b);
//   const h = s ? (l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s) : 0;
//   return [
//     Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
//     Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
//     Math.round((100 * (2 * l - s)) / 2),
//   ];
// };

export const RGBtoHSL = (rgb: number[]): number[] => {
  const r = (rgb[0] /= 255);
  const g = (rgb[1] /= 255);
  const b = (rgb[2] /= 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

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

  // Format the HSL values to CSS syntax
  h = Number(Math.round((h * 360) % 360));
  s = Number(Math.round(s * 100));
  l = Number(Math.round(l * 100));

  return [h, s, l];
};

export const RGBtoHEXA = (rgb: number[]): string =>
  `#${rgb
    .slice(0, 3)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}${Math.round(rgb[3] * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const RGBtoHSLA = (rgb: number[]): number[] => {
  const r = (rgb[0] /= 255);
  const g = (rgb[1] /= 255);
  const b = (rgb[2] /= 255);
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s ? (l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s) : 0;
  return [
    Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
    Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
    Math.round((100 * (2 * l - s)) / 2),
    rgb[3],
  ];
};

export const HSLtoHEX = (hsl: number[]): string => {
  const h = hsl[0];
  const s = hsl[1];
  let l = hsl[2];
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const HSLtoHEXA = (hsl: number[]): string => {
  const h = hsl[0];
  const s = hsl[1];
  let l = hsl[2];
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}${Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")}`;
};

export const HSLtoRGB = (hsl: number[]): number[] => {
  const h = hsl[0];
  const s = (hsl[1] /= 100);
  const l = (hsl[2] /= 100);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
};

export const HSLtoRGBA = (hsl: number[]): number[] => {
  const h = hsl[0];
  const s = (hsl[1] /= 100);
  const l = (hsl[2] /= 100);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4)), hsl[3]];
};

// OKLCH Color Conversions
const linearToSRGB = (c: number): number => {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
};

const sRGBToLinear = (c: number): number => {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

// Convert RGB to OKLCH
export const RGBtoOKLCH = (rgb: number[]): number[] => {
  // Normalize RGB to 0-1
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;

  // Convert sRGB to linear RGB
  const linearR = sRGBToLinear(r);
  const linearG = sRGBToLinear(g);
  const linearB = sRGBToLinear(b);

  // Convert linear RGB to OKLab
  const l_ = 0.4122214708 * linearR + 0.5363325363 * linearG + 0.0514459929 * linearB;
  const m_ = 0.2119034982 * linearR + 0.6806995451 * linearG + 0.1073969566 * linearB;
  const s_ = 0.0883024619 * linearR + 0.2817188376 * linearG + 0.6299787005 * linearB;

  const l_cubed = Math.cbrt(l_);
  const m_cubed = Math.cbrt(m_);
  const s_cubed = Math.cbrt(s_);

  const L = 0.2104542553 * l_cubed + 0.793617785 * m_cubed - 0.0040720468 * s_cubed;
  const a = 1.9779984951 * l_cubed - 2.428592205 * m_cubed + 0.4505937099 * s_cubed;
  const bOklab = 0.0259040371 * l_cubed + 0.7827717662 * m_cubed - 0.808675766 * s_cubed;

  // Convert OKLab to OKLCH
  const C = Math.sqrt(a * a + bOklab * bOklab);
  let H = Math.atan2(bOklab, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return [Math.round(L * 1000) / 1000, Math.round(C * 1000) / 1000, Math.round(H * 10) / 10];
};

// Convert OKLCH to RGB
export const OKLCHtoRGB = (oklch: number[]): number[] => {
  const L = oklch[0];
  const C = oklch[1];
  const H = oklch[2];

  // Convert OKLCH to OKLab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // Convert OKLab to linear RGB via LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Convert linear RGB to sRGB and clamp
  const r = Math.round(Math.min(Math.max(linearToSRGB(linearR), 0), 1) * 255);
  const g = Math.round(Math.min(Math.max(linearToSRGB(linearG), 0), 1) * 255);
  const bRgb = Math.round(Math.min(Math.max(linearToSRGB(linearB), 0), 1) * 255);

  return [r, g, bRgb];
};

// Convert HEX to OKLCH
export const HEXtoOKLCH = (hex: string): number[] => {
  const rgb = HEXtoRGB(hex);
  return RGBtoOKLCH(rgb);
};

// Convert HSL to OKLCH
export const HSLtoOKLCH = (hsl: number[]): number[] => {
  const rgb = HSLtoRGB(hsl);
  return RGBtoOKLCH(rgb);
};

// Convert OKLCH to HEX
export const OKLCHtoHEX = (oklch: number[]): string => {
  const rgb = OKLCHtoRGB(oklch);
  return RGBtoHEX(rgb);
};

// Convert OKLCH to HSL
export const OKLCHtoHSL = (oklch: number[]): number[] => {
  const rgb = OKLCHtoRGB(oklch);
  return RGBtoHSL(rgb);
};

export const Base64toDecode = (base64: string): string => {
  const buff = Buffer.from(base64, "base64");
  return buff.toString("ascii");
};

export const Base64toEncode = (base64: string): string => {
  const buff = Buffer.from(base64);
  return buff.toString("base64");
};
