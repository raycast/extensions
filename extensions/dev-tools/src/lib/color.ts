// Color parsing, conversion, and formatting. The canonical representation is
// RGBA with r/g/b as integers 0–255 and a (alpha) as 0–1. HSL/HSV are derived on
// demand. Input may be hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba(),
// hsl()/hsla(), or hsv()/hsva() (a.k.a. hsb).

import { hexToName, nameToHex } from "./css-colors";

export type Rgba = { r: number; g: number; b: number; a: number };
export type Hsla = { h: number; s: number; l: number; a: number };
export type Hsva = { h: number; s: number; v: number; a: number };
export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv";

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
const ch = (n: number) => clamp(Math.round(n), 0, 255);

function parseAlphaToken(token: string): number {
  const value = token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token);
  return Number.isNaN(value) ? 1 : clamp(value, 0, 1);
}

function parseChannel(token: string): number | null {
  const value = token.endsWith("%") ? (parseFloat(token) / 100) * 255 : parseFloat(token);
  return Number.isNaN(value) ? null : clamp(Math.round(value), 0, 255);
}

function parseHex(input: string): Rgba | null {
  const match = /^#?([0-9a-f]+)$/i.exec(input.trim());
  if (!match) return null;
  const hex = match[1];
  const hasHash = input.trim().startsWith("#");
  const dup = (c: string) => parseInt(c + c, 16);
  const pair = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  // Require "#" for the 3/4-digit shorthand so a bare "255" isn't read as a color.
  if ((hex.length === 3 || hex.length === 4) && !hasHash) return null;
  switch (hex.length) {
    case 3:
      return { r: dup(hex[0]), g: dup(hex[1]), b: dup(hex[2]), a: 1 };
    case 4:
      return { r: dup(hex[0]), g: dup(hex[1]), b: dup(hex[2]), a: dup(hex[3]) / 255 };
    case 6:
      return { r: pair(0), g: pair(2), b: pair(4), a: 1 };
    case 8:
      return { r: pair(0), g: pair(2), b: pair(4), a: pair(6) / 255 };
    default:
      return null;
  }
}

function parseFunctional(input: string): Rgba | null {
  const match = /^(rgb|hsl|hsv|hsb|hwb|oklch)a?\(([^)]*)\)$/i.exec(input.trim());
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const parts = match[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const a = parts[3] !== undefined ? parseAlphaToken(parts[3]) : 1;

  if (kind === "rgb") {
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    if (r === null || g === null || b === null) return null;
    return { r, g, b, a };
  }

  const x = parseFloat(parts[0]);
  const y = parseFloat(parts[1]);
  const z = parseFloat(parts[2]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null;
  if (kind === "hsl") return hslToRgb({ h: x, s: clamp(y, 0, 100), l: clamp(z, 0, 100), a });
  if (kind === "hsv" || kind === "hsb") return hsvToRgb({ h: x, s: clamp(y, 0, 100), v: clamp(z, 0, 100), a });
  if (kind === "hwb") return hwbToRgb({ h: x, w: clamp(y, 0, 100), b: clamp(z, 0, 100), a });
  const lightness = parts[0].endsWith("%") ? x / 100 : x;
  return oklchToRgb({ l: clamp(lightness, 0, 1), c: Math.max(0, y), h: z, a });
}

/** Parse any supported color string, or `null` if it isn't recognized. */
export function parseColor(input: string): Rgba | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const named = nameToHex(trimmed);
  if (named) return parseHex(named);
  return parseFunctional(trimmed) ?? parseHex(trimmed);
}

/** The CSS keyword for this color if one matches exactly, else `null`. */
export function colorName(c: Rgba): string | null {
  if (c.a === 0) return "transparent";
  if (c.a < 1) return null;
  return hexToName(toHex(c, false));
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function rgbHue(r: number, g: number, b: number, max: number, d: number): number {
  if (d === 0) return 0;
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
      break;
  }
  return h * 60;
}

export function rgbToHsl(c: Rgba): Hsla {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return { h: rgbHue(r, g, b, max, d), s: s * 100, l: l * 100, a: c.a };
}

export function rgbToHsv(c: Rgba): Hsva {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  return { h: rgbHue(r, g, b, max, d), s: s * 100, v: max * 100, a: c.a };
}

export function hslToRgb(c: Hsla): Rgba {
  const h = (((c.h % 360) + 360) % 360) / 360;
  const s = clamp(c.s, 0, 100) / 100;
  const l = clamp(c.l, 0, 100) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: clamp(c.a, 0, 1) };
}

export function hsvToRgb(c: Hsva): Rgba {
  const h = (((c.h % 360) + 360) % 360) / 60;
  const s = clamp(c.s, 0, 100) / 100;
  const v = clamp(c.v, 0, 100) / 100;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const m = v - chroma;
  const [r, g, b] =
    h < 1
      ? [chroma, x, 0]
      : h < 2
        ? [x, chroma, 0]
        : h < 3
          ? [0, chroma, x]
          : h < 4
            ? [0, x, chroma]
            : h < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: clamp(c.a, 0, 1),
  };
}

const hex2 = (n: number) => ch(n).toString(16).padStart(2, "0");
const fmtAlpha = (a: number) => String(Math.round(a * 100) / 100);

export function toHex(c: Rgba, alpha: boolean): string {
  const base = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return alpha ? base + hex2(c.a * 255) : base;
}

export function toRgbString(c: Rgba, alpha: boolean): string {
  const body = `${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}`;
  return alpha ? `rgba(${body}, ${fmtAlpha(c.a)})` : `rgb(${body})`;
}

export function toHslString(c: Rgba, alpha: boolean): string {
  const { h, s, l } = rgbToHsl(c);
  const body = `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
  return alpha ? `hsla(${body}, ${fmtAlpha(c.a)})` : `hsl(${body})`;
}

export function toHsvString(c: Rgba, alpha: boolean): string {
  const { h, s, v } = rgbToHsv(c);
  const body = `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(v)}%`;
  return alpha ? `hsva(${body}, ${fmtAlpha(c.a)})` : `hsv(${body})`;
}

export function formatColor(c: Rgba, format: ColorFormat, alpha: boolean): string {
  switch (format) {
    case "rgb":
      return toRgbString(c, alpha);
    case "hsl":
      return toHslString(c, alpha);
    case "hsv":
      return toHsvString(c, alpha);
    default:
      return toHex(c, alpha);
  }
}

/** Guess the format of an input string so edits can stay in the same notation. */
export function detectFormat(input: string): ColorFormat {
  const s = input.trim().toLowerCase();
  if (s.startsWith("hsl")) return "hsl";
  if (s.startsWith("hsv") || s.startsWith("hsb")) return "hsv";
  if (s.startsWith("rgb")) return "rgb";
  return "hex";
}

/** Nudge a color by HSL deltas (hue wraps; saturation/lightness/alpha clamp). */
export function adjustHsl(c: Rgba, delta: Partial<Hsla>): Rgba {
  const hsl = rgbToHsl(c);
  const next = hslToRgb({
    h: hsl.h + (delta.h ?? 0),
    s: clamp(hsl.s + (delta.s ?? 0), 0, 100),
    l: clamp(hsl.l + (delta.l ?? 0), 0, 100),
    a: 1,
  });
  return { ...next, a: clamp(c.a + (delta.a ?? 0), 0, 1) };
}

/** Lightness ramp from dark to light at the color's hue/saturation. */
export function shades(c: Rgba, count = 9): Rgba[] {
  const { h, s } = rgbToHsl(c);
  return Array.from({ length: count }, (_, i) => hslToRgb({ h, s, l: ((i + 0.5) / count) * 100, a: c.a }));
}

/** Classic hue-based harmonies relative to the color. */
export function harmonies(c: Rgba): { label: string; color: Rgba }[] {
  const { h, s, l } = rgbToHsl(c);
  const at = (dh: number) => hslToRgb({ h: h + dh, s, l, a: c.a });
  return [
    { label: "Complementary", color: at(180) },
    { label: "Analogous −30°", color: at(-30) },
    { label: "Analogous +30°", color: at(30) },
    { label: "Triadic +120°", color: at(120) },
    { label: "Triadic +240°", color: at(240) },
  ];
}

function swatchSvg(c: Rgba, w: number, h: number, rx: number): string {
  const fill = `rgb(${ch(c.r)},${ch(c.g)},${ch(c.b)})`;
  const tile = Math.max(8, Math.round(Math.min(w, h) / 5));
  const half = Math.round(tile / 2);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><pattern id="p" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">` +
    `<rect width="${tile}" height="${tile}" fill="#ffffff"/><rect width="${half}" height="${half}" fill="#cfcfcf"/>` +
    `<rect x="${half}" y="${half}" width="${half}" height="${half}" fill="#cfcfcf"/></pattern></defs>` +
    `<rect width="${w}" height="${h}" rx="${rx}" fill="url(#p)"/>` +
    `<rect width="${w}" height="${h}" rx="${rx}" fill="${fill}" fill-opacity="${c.a}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Small square swatch for list-row icons. */
export const swatchDataUri = (c: Rgba): string => swatchSvg(c, 48, 48, 10);

/** Large banner swatch embedded in detail-pane markdown. */
export const swatchMarkdown = (c: Rgba): string => `![preview](${swatchSvg(c, 700, 320, 24)})`;

// ---------------------------------------------------------------------------
// HWB
// ---------------------------------------------------------------------------

export type Hwb = { h: number; w: number; b: number; a: number };

export function rgbToHwb(c: Rgba): Hwb {
  const { h } = rgbToHsl(c);
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  return { h, w: Math.min(r, g, b) * 100, b: (1 - Math.max(r, g, b)) * 100, a: c.a };
}

export function hwbToRgb(c: Hwb): Rgba {
  let w = clamp(c.w, 0, 100) / 100;
  let bl = clamp(c.b, 0, 100) / 100;
  if (w + bl > 1) {
    const sum = w + bl;
    w /= sum;
    bl /= sum;
  }
  const pure = hslToRgb({ h: c.h, s: 100, l: 50, a: 1 });
  const mix = (channel: number) => Math.round(((channel / 255) * (1 - w - bl) + w) * 255);
  return { r: mix(pure.r), g: mix(pure.g), b: mix(pure.b), a: clamp(c.a, 0, 1) };
}

// ---------------------------------------------------------------------------
// OKLCH (via OKLab). Matrices from Björn Ottosson's reference implementation.
// ---------------------------------------------------------------------------

export type Oklch = { l: number; c: number; h: number; a: number };

const srgbToLinear = (v: number) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const linearToSrgb = (v: number) => {
  const x = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return clamp(Math.round(x * 255), 0, 255);
};

export function rgbToOklch(c: Rgba): Oklch {
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.sqrt(okA * okA + okB * okB);
  let hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return { l: okL, c: chroma, h: hue, a: c.a };
}

export function oklchToRgb(c: Oklch): Rgba {
  const hr = (c.h * Math.PI) / 180;
  const okA = c.c * Math.cos(hr);
  const okB = c.c * Math.sin(hr);
  const l = (c.l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const m = (c.l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const s = (c.l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b), a: clamp(c.a, 0, 1) };
}

// ---------------------------------------------------------------------------
// Color-model abstraction: a uniform channel view over every model so the UI
// can render sliders and adjust values generically.
// ---------------------------------------------------------------------------

export type ColorModel = "oklch" | "hwb" | "hsl" | "hsv" | "rgb";
export const COLOR_MODELS: ColorModel[] = ["oklch", "hwb", "hsl", "hsv", "rgb"];

export type Channel = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  precision: number;
  unit: string;
};

type ChannelSpec = Omit<Channel, "value">;

const SPECS: Record<ColorModel, ChannelSpec[]> = {
  oklch: [
    { label: "Lightness", min: 0, max: 1, step: 0.01, precision: 3, unit: "" },
    { label: "Chroma", min: 0, max: 0.4, step: 0.005, precision: 3, unit: "" },
    { label: "Hue", min: 0, max: 360, step: 5, precision: 0, unit: "°" },
  ],
  hwb: [
    { label: "Hue", min: 0, max: 360, step: 5, precision: 0, unit: "°" },
    { label: "Whiteness", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
    { label: "Blackness", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
  ],
  hsl: [
    { label: "Hue", min: 0, max: 360, step: 5, precision: 0, unit: "°" },
    { label: "Saturation", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
    { label: "Lightness", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
  ],
  hsv: [
    { label: "Hue", min: 0, max: 360, step: 5, precision: 0, unit: "°" },
    { label: "Saturation", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
    { label: "Value", min: 0, max: 100, step: 2, precision: 1, unit: "%" },
  ],
  rgb: [
    { label: "Red", min: 0, max: 255, step: 1, precision: 0, unit: "" },
    { label: "Green", min: 0, max: 255, step: 1, precision: 0, unit: "" },
    { label: "Blue", min: 0, max: 255, step: 1, precision: 0, unit: "" },
  ],
};

const ALPHA_SPEC: ChannelSpec = { label: "Alpha", min: 0, max: 1, step: 0.05, precision: 2, unit: "" };

const TO_VALUES: Record<ColorModel, (c: Rgba) => number[]> = {
  rgb: (c) => [c.r, c.g, c.b],
  hsl: (c) => {
    const x = rgbToHsl(c);
    return [x.h, x.s, x.l];
  },
  hsv: (c) => {
    const x = rgbToHsv(c);
    return [x.h, x.s, x.v];
  },
  hwb: (c) => {
    const x = rgbToHwb(c);
    return [x.h, x.w, x.b];
  },
  oklch: (c) => {
    const x = rgbToOklch(c);
    return [x.l, x.c, x.h];
  },
};

const FROM_VALUES: Record<ColorModel, (v: number[], a: number) => Rgba> = {
  rgb: (v, a) => ({ r: ch(v[0]), g: ch(v[1]), b: ch(v[2]), a: clamp(a, 0, 1) }),
  hsl: (v, a) => hslToRgb({ h: v[0], s: v[1], l: v[2], a }),
  hsv: (v, a) => hsvToRgb({ h: v[0], s: v[1], v: v[2], a }),
  hwb: (v, a) => hwbToRgb({ h: v[0], w: v[1], b: v[2], a }),
  oklch: (v, a) => oklchToRgb({ l: v[0], c: v[1], h: v[2], a }),
};

const fmtNum = (n: number, precision: number) => String(Math.round(n * 10 ** precision) / 10 ** precision);

/** The channels of `model` for `c`, alpha appended last. */
export function channelsOf(c: Rgba, model: ColorModel): Channel[] {
  const values = TO_VALUES[model](c);
  const channels: Channel[] = SPECS[model].map((spec, i) => ({ ...spec, value: values[i] }));
  channels.push({ ...ALPHA_SPEC, value: c.a });
  return channels;
}

/** Return a new color with channel `index` of `model` set to `value`. */
export function withChannel(c: Rgba, model: ColorModel, index: number, value: number): Rgba {
  const specs = SPECS[model];
  if (index === specs.length) return { ...c, a: clamp(value, 0, 1) };
  const values = TO_VALUES[model](c);
  values[index] = clamp(value, specs[index].min, specs[index].max);
  return FROM_VALUES[model](values, c.a);
}

/** Format `c` in `model`'s CSS notation (space-separated, alpha only when < 1). */
export function modelString(c: Rgba, model: ColorModel): string {
  const v = TO_VALUES[model](c);
  const p = SPECS[model];
  const num = (i: number) => fmtNum(v[i], p[i].precision) + (p[i].unit === "%" ? "%" : "");
  const alpha = c.a < 1 ? ` / ${fmtNum(c.a, 2)}` : "";
  return `${model}(${num(0)} ${num(1)} ${num(2)}${alpha})`;
}

/** Display label for a channel value, e.g. `37.3%` or `245°`. */
export const channelDisplay = (channel: Channel): string => fmtNum(channel.value, channel.precision) + channel.unit;

/** Hex colors sampled across a channel's range (for slider gradient stops). */
export function channelGradientHexes(c: Rgba, model: ColorModel, index: number, steps = 10): string[] {
  const channels = channelsOf(c, model);
  const { min, max } = channels[index];
  return Array.from({ length: steps + 1 }, (_, i) =>
    toHex(withChannel(c, model, index, min + ((max - min) * i) / steps), false),
  );
}
