import { NAMED_COLORS } from "./named-colors";

export interface RGB {
  /** 0-255 */
  r: number;
  /** 0-255 */
  g: number;
  /** 0-255 */
  b: number;
  /** 0-1 */
  a: number;
}

const WHITE: RGB = { r: 255, g: 255, b: 255, a: 1 };

/** Parses a hex, rgb(a), hsl(a), or CSS named color. Returns null if invalid. */
export function parseColor(input: string): RGB | null {
  const value = input.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (NAMED_COLORS[value]) {
    return parseHex(NAMED_COLORS[value]);
  }
  if (value.startsWith("#")) {
    return parseHex(value);
  }
  if (value.startsWith("rgb")) {
    return parseRgb(value);
  }
  if (value.startsWith("hsl")) {
    return parseHsl(value);
  }
  if (value.startsWith("hsb") || value.startsWith("hsv")) {
    return parseHsb(value);
  }
  if (value.startsWith("cmyk")) {
    return parseCmyk(value);
  }
  // Bare hex without the leading #, e.g. "ff0000".
  if (/^[0-9a-f]{3,8}$/.test(value)) {
    return parseHex(`#${value}`);
  }
  return null;
}

function parseHex(value: string): RGB | null {
  let hex = value.replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) {
    return null;
  }
  if (!/^[0-9a-f]+$/.test(hex)) {
    return null;
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function parseRgb(value: string): RGB | null {
  const parts = value
    .replace(/^rgba?\(/, "")
    .replace(/\)$/, "")
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const channel = (raw: string) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) {
      return null;
    }
    return raw.includes("%") ? Math.round((num / 100) * 255) : Math.round(num);
  };
  const r = channel(parts[0]);
  const g = channel(parts[1]);
  const b = channel(parts[2]);
  if (r === null || g === null || b === null) {
    return null;
  }
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
}

function parseHsl(value: string): RGB | null {
  const parts = value
    .replace(/^hsla?\(/, "")
    .replace(/\)$/, "")
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some((n) => Number.isNaN(n))) {
    return null;
  }
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  return { ...hslToRgb(h, s, l), a };
}

function parseHsb(value: string): RGB | null {
  const parts = value
    .replace(/^hs[bv]a?\(/, "")
    .replace(/\)$/, "")
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const b = parseFloat(parts[2]) / 100;
  if ([h, s, b].some((n) => Number.isNaN(n))) {
    return null;
  }
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  return { ...hsbToRgb(h, s, b), a };
}

function parseCmyk(value: string): RGB | null {
  const parts = value
    .replace(/^cmyk\(/, "")
    .replace(/\)$/, "")
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 4) {
    return null;
  }
  const component = (raw: string) => {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) {
      return null;
    }
    // Accept percentages, 0-100, or 0-1.
    const normalized = raw.includes("%") || num > 1 ? num / 100 : num;
    return clamp(normalized, 0, 1);
  };
  const values = parts.slice(0, 4).map(component);
  if (values.some((n) => n === null)) {
    return null;
  }
  const [c, m, y, k] = values as number[];
  return { ...cmykToRgb(c, m, y, k), a: 1 };
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export function cmykToRgb(
  c: number,
  m: number,
  y: number,
  k: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

/** Standard (profile-less) RGB → CMYK conversion, in whole percentages. */
export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function formatCmyk({ c, m, y, k }: CMYK): string {
  return `${c}%, ${m}%, ${y}%, ${k}%`;
}

export function formatRgb({ r, g, b }: RGB): string {
  return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
}

export interface HSB {
  h: number;
  s: number;
  b: number;
}

export function rgbToHsb({ r, g, b }: RGB): HSB {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
  }
  return {
    h,
    s: Math.round((max === 0 ? 0 : delta / max) * 100),
    b: Math.round(max * 100),
  };
}

export function hsbToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const val = clamp(v, 0, 1);
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function formatHsb({ h, s, b }: HSB): string {
  return `${h}°, ${s}%, ${b}%`;
}

function parseAlpha(raw: string): number {
  const num = parseFloat(raw);
  if (Number.isNaN(num)) {
    return 1;
  }
  return clamp(raw.includes("%") ? num / 100 : num, 0, 1);
}

export function toHex({ r, g, b }: RGB): string {
  const part = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Composites a color (possibly translucent) over an opaque background. */
export function composite(color: RGB, background: RGB): RGB {
  if (color.a >= 1) {
    return { ...color, a: 1 };
  }
  const blend = (fg: number, bg: number) => fg * color.a + bg * (1 - color.a);
  return {
    r: blend(color.r, background.r),
    g: blend(color.g, background.g),
    b: blend(color.b, background.b),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, compositing any translucency before comparing. */
export function contrastRatio(foreground: RGB, background: RGB): number {
  const solidBackground = composite(background, WHITE);
  const solidForeground = composite(foreground, solidBackground);
  const l1 = relativeLuminance(solidForeground);
  const l2 = relativeLuminance(solidBackground);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbToHsl({ r, g, b }: RGB): {
  h: number;
  s: number;
  l: number;
} {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
