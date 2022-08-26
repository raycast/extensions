import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
    basePixel?: number;
}

const loadBasePixelsFromPreferences = () => {
    const basePixel = Number(getPreferenceValues<Preferences>().basePixel);
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

    return result ? [
        parseInt(result[1] ?? result[4] + result[4], 16),
        parseInt(result[2] ?? result[5] + result[5], 16),
        parseInt(result[3] ?? result[6] + result[6], 16)
    ] : [0, 0, 0];
}

export const HEXtoRGBA = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        Math.round(((parseInt(result[4], 16)) / 255) * 100) / 100
    ] : [0, 0, 0, 0];
}

export const HEXtoHSL = (hex: string): number[] => {
    const rgb = HEXtoRGB(hex);
    const r = rgb[0] /= 255;
    const g = rgb[1] /= 255;
    const b = rgb[2] /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
                ? 2 + (b - r) / s
                : 4 + (r - g) / s
        : 0;
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
    ];
}

export const HEXtoHSLA = (hex: string): number[] => {
    const rgba = HEXtoRGBA(hex);
    const r = rgba[0] /= 255;
    const g = rgba[1] /= 255;
    const b = rgba[2] /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
                ? 2 + (b - r) / s
                : 4 + (r - g) / s
        : 0;
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
        rgba[3],
    ];
}

export const RGBtoHEX = (rgb: number[]): string => `#${rgb.map(x => x.toString(16).padStart(2, '0')).join('')}`;

export const RGBtoHSL = (rgb: number[]): number[] => {
    const r = rgb[0] /= 255;
    const g = rgb[1] /= 255;
    const b = rgb[2] /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s ? l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s : 0;
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
    ];
}

export const RGBtoHEXA = (rgb: number[]): string => `#${rgb.slice(0,3).map(x => x.toString(16).padStart(2, '0')).join('')}${Math.round(rgb[3] * 255).toString(16).padStart(2, '0')}`;

export const RGBtoHSLA = (rgb: number[]): number[] => {
    const r = rgb[0] /= 255;
    const g = rgb[1] /= 255;
    const b = rgb[2] /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s ? l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s : 0;
    return [
        Math.round(60 * h < 0 ? 60 * h + 360 : 60 * h),
        Math.round(100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)),
        Math.round((100 * (2 * l - s)) / 2),
        rgb[3],
    ];
}

export const HSLtoHEX = (hsl: number[]): string => {
    const h = hsl[0];
    const s = hsl[1];
    let l = hsl[2];
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export const HSLtoHEXA = (hsl: number[]): string => {
    const h = hsl[0];
    const s = hsl[1];
    let l = hsl[2];
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

export const HSLtoRGB = (hsl: number[]): number[] => {
    const h = hsl[0];
    const s = hsl[1] /= 100;
    const l = hsl[2] /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

export const HSLtoRGBA = (hsl: number[]): number[] => {
    const h = hsl[0];
    const s = hsl[1] /= 100;
    const l = hsl[2] /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4)), hsl[3]];
}