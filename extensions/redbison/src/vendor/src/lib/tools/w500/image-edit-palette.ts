/**
 * Colour palette maths for the Color Palette Generator page and its MCP tool.
 *
 * - sRGB <-> HSL use the CSS Color 4 definitions.
 * - OKLab / OKLCH use Björn Ottosson's published matrices (2020), the same
 *   space CSS Color 4 exposes as oklch().
 * - Contrast uses WCAG 2.x relative luminance, the same formula as
 *   src/lib/tools/contrast-checker.ts (kept local so this file has no imports
 *   and bundles cleanly into the Deno MCP server).
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };
export type Oklch = { l: number; c: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mod360 = (h: number) => ((h % 360) + 360) % 360;

/* ------------------------------------------------------------------ parsing */

const NAMED: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff',
  yellow: '#ffff00', cyan: '#00ffff', aqua: '#00ffff', magenta: '#ff00ff', fuchsia: '#ff00ff', gray: '#808080',
  grey: '#808080', silver: '#c0c0c0', maroon: '#800000', olive: '#808000', purple: '#800080', teal: '#008080',
  navy: '#000080', orange: '#ffa500', rebeccapurple: '#663399', coral: '#ff7f50', tomato: '#ff6347',
  gold: '#ffd700', indigo: '#4b0082', crimson: '#dc143c', salmon: '#fa8072', turquoise: '#40e0d0',
  pink: '#ffc0cb', brown: '#a52a2a', tan: '#d2b48c', khaki: '#f0e68c', lavender: '#e6e6fa', beige: '#f5f5dc',
};

function num(s: string): number {
  return Number(s.trim());
}

/** Channel token that may be a number (0-255) or a percentage. */
function rgbChannel(tok: string): number {
  const t = tok.trim();
  if (t.endsWith('%')) return clamp((num(t.slice(0, -1)) / 100) * 255, 0, 255);
  return clamp(num(t), 0, 255);
}

/**
 * Parses #rgb, #rrggbb, #rrggbbaa (alpha ignored), rgb()/rgba() in comma or
 * space syntax, hsl()/hsla(), oklch() and a set of common CSS colour names.
 * Returns null for anything it cannot read.
 */
export function parseColor(input: string): Rgb | null {
  const s = String(input ?? '').trim().toLowerCase();
  if (!s) return null;
  if (NAMED[s]) return parseColor(NAMED[s]);
  const hex = s.replace(/^#/, '');
  if (/^[0-9a-f]{3,4}$/.test(hex)) {
    const [r, g, b] = hex.split('').map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  const fn = /^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map(rgbChannel);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }
  if (fn[1].startsWith('hsl')) {
    const h = num(parts[0].replace(/deg$/, ''));
    const sat = num(parts[1].replace('%', ''));
    const l = num(parts[2].replace('%', ''));
    if ([h, sat, l].some((v) => Number.isNaN(v))) return null;
    return hslToRgb({ h, s: clamp(sat, 0, 100), l: clamp(l, 0, 100) });
  }
  // oklch(L C H): L as 0-1 or percentage
  const L = parts[0].endsWith('%') ? num(parts[0].slice(0, -1)) / 100 : num(parts[0]);
  const C = num(parts[1]);
  const H = num(parts[2].replace(/deg$/, ''));
  if ([L, C, H].some((v) => Number.isNaN(v))) return null;
  return oklchToRgb({ l: L, c: C, h: H });
}

/* ------------------------------------------------------------ conversions */

export function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

/** CSS Color 4 HSL. Hue in degrees [0, 360), saturation and lightness in percent (unrounded). */
export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: mod360(h * 60), s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = clamp(s, 0, 100) / 100, L = clamp(l, 0, 100) / 100;
  const f = (n: number) => {
    const k = (n + mod360(h) / 30) % 12;
    const a = S * Math.min(L, 1 - L);
    return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;

/** sRGB to OKLCH (L 0-1, C roughly 0-0.37, H degrees). */
export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + Bb * Bb);
  const H = C < 1e-7 ? 0 : mod360((Math.atan2(Bb, A) * 180) / Math.PI);
  return { l: L, c: C, h: H };
}

/** OKLCH to unclamped linear-to-gamma sRGB channels (may fall outside 0-255). */
function oklchToRgbRaw({ l: L, c: C, h: H }: Oklch): [number, number, number] {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr), B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const Bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [fromLinear(R), fromLinear(G), fromLinear(Bl)];
}

function inGamut(ch: [number, number, number]): boolean {
  return ch.every((v) => v >= -0.5 && v <= 255.5);
}

/**
 * OKLCH to sRGB. Out-of-gamut colours keep their lightness and hue and lose
 * chroma (binary search) until they fit, which is the CSS Color 4 approach in spirit.
 */
export function oklchToRgb(c: Oklch): Rgb {
  const L = clamp(c.l, 0, 1);
  let raw = oklchToRgbRaw({ ...c, l: L });
  if (!inGamut(raw)) {
    let lo = 0, hi = Math.max(0, c.c);
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgbRaw({ l: L, c: mid, h: c.h }))) lo = mid;
      else hi = mid;
    }
    raw = oklchToRgbRaw({ l: L, c: lo, h: c.h });
  }
  return { r: clamp(Math.round(raw[0]), 0, 255), g: clamp(Math.round(raw[1]), 0, 255), b: clamp(Math.round(raw[2]), 0, 255) };
}

/* ------------------------------------------------------------- harmonies */

export type HarmonyRule =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'square'
  | 'monochromatic'
  | 'shades';

export type ColorWheel = 'rgb' | 'ryb' | 'oklch';

export const HARMONY_RULES: { id: HarmonyRule; label: string; offsets?: number[]; note: string }[] = [
  { id: 'complementary', label: 'Complementary', offsets: [0, 180], note: 'Base plus the hue opposite it on the wheel.' },
  { id: 'analogous', label: 'Analogous', offsets: [-60, -30, 0, 30, 60], note: 'Neighbours 30° apart on either side of the base.' },
  { id: 'triadic', label: 'Triadic', offsets: [0, 120, 240], note: 'Three hues evenly spaced 120° apart.' },
  { id: 'split-complementary', label: 'Split-complementary', offsets: [0, 150, 210], note: 'Base plus the two hues beside its complement.' },
  { id: 'tetradic', label: 'Tetradic (rectangle)', offsets: [0, 60, 180, 240], note: 'Two complementary pairs 60° apart.' },
  { id: 'square', label: 'Square', offsets: [0, 90, 180, 270], note: 'Four hues evenly spaced 90° apart.' },
  { id: 'monochromatic', label: 'Monochromatic', note: 'One hue at five lightness levels.' },
  { id: 'shades', label: 'Tints and shades', note: 'The base mixed toward white and toward black.' },
];

/**
 * Piecewise-linear map between the artist's red-yellow-blue wheel and the
 * RGB hue circle. RYB places red, yellow and blue 120° apart and the
 * secondaries orange, green and violet between them; the anchors pin those
 * six colours to their usual RGB hues. It is an approximation: there is no
 * single standard RYB space.
 */
const RYB_ANCHORS: [number, number][] = [
  [0, 0], // red
  [60, 30], // orange
  [120, 60], // yellow
  [180, 120], // green
  [240, 240], // blue
  [300, 270], // violet
  [360, 360],
];

function interp(h: number, from: 0 | 1, to: 0 | 1): number {
  const x = mod360(h);
  for (let i = 0; i < RYB_ANCHORS.length - 1; i++) {
    const a = RYB_ANCHORS[i], b = RYB_ANCHORS[i + 1];
    if (x >= a[from] && x <= b[from]) {
      const t = (x - a[from]) / (b[from] - a[from] || 1);
      return mod360(a[to] + t * (b[to] - a[to]));
    }
  }
  return x;
}
export const rgbHueToRyb = (h: number) => interp(h, 1, 0);
export const rybHueToRgb = (h: number) => interp(h, 0, 1);

/** Rotates the hue of a colour by `deg` on the chosen wheel, keeping saturation and lightness. */
export function rotateHue(color: Rgb, deg: number, wheel: ColorWheel = 'rgb'): Rgb {
  if (deg % 360 === 0) return { ...color };
  if (wheel === 'oklch') {
    const o = rgbToOklch(color);
    return oklchToRgb({ ...o, h: mod360(o.h + deg) });
  }
  const hsl = rgbToHsl(color);
  const h = wheel === 'ryb' ? rybHueToRgb(rgbHueToRyb(hsl.h) + deg) : mod360(hsl.h + deg);
  return hslToRgb({ ...hsl, h });
}

/** Mixes toward white (t > 0) or black (t < 0) in sRGB, t in [-1, 1]. */
export function mix(color: Rgb, t: number): Rgb {
  const target = t >= 0 ? 255 : 0;
  const k = Math.abs(clamp(t, -1, 1));
  return {
    r: Math.round(color.r + (target - color.r) * k),
    g: Math.round(color.g + (target - color.g) * k),
    b: Math.round(color.b + (target - color.b) * k),
  };
}

export type PaletteColor = {
  hex: string;
  rgb: Rgb;
  hsl: Hsl;
  role: string;
};

function describe(rgb: Rgb, role: string): PaletteColor {
  const hsl = rgbToHsl(rgb);
  return { hex: rgbToHex(rgb), rgb, hsl, role };
}

/** Builds the palette for one harmony rule. The base colour is always included unchanged. */
export function harmonyPalette(base: Rgb, rule: HarmonyRule, wheel: ColorWheel = 'rgb'): PaletteColor[] {
  if (rule === 'monochromatic') {
    // Same hue and saturation, lightness spread around the base while keeping it in the set.
    if (wheel === 'oklch') {
      const o = rgbToOklch(base);
      const steps = monoSteps(o.l * 100).map((l) => (l === null ? base : oklchToRgb({ ...o, l: l / 100 })));
      return steps.map((c, i) => describe(c, i === 2 ? 'base' : i < 2 ? `lighter ${2 - i}` : `darker ${i - 2}`));
    }
    const hsl = rgbToHsl(base);
    const steps = monoSteps(hsl.l).map((l) => (l === null ? base : hslToRgb({ ...hsl, l })));
    return steps.map((c, i) => describe(c, i === 2 ? 'base' : i < 2 ? `lighter ${2 - i}` : `darker ${i - 2}`));
  }
  if (rule === 'shades') {
    const ts = [0.6, 0.3, 0, -0.3, -0.6];
    return ts.map((t) => describe(t === 0 ? base : mix(base, t), t === 0 ? 'base' : t > 0 ? `tint ${Math.round(t * 100)}%` : `shade ${Math.round(-t * 100)}%`));
  }
  const def = HARMONY_RULES.find((r) => r.id === rule);
  if (!def?.offsets) throw new Error(`Unknown harmony rule: ${rule}`);
  return def.offsets.map((off) => describe(off === 0 ? base : rotateHue(base, off, wheel), off === 0 ? 'base' : `${off > 0 ? '+' : ''}${off}°`));
}

/**
 * Five lightness values with the base in the middle (null marks the base).
 * Steps are spaced to use the room available above and below the base.
 */
function monoSteps(l: number): (number | null)[] {
  const up = (95 - l) / 2;
  const down = (l - 10) / 2;
  const su = Math.max(up, 4), sd = Math.max(down, 4);
  return [clamp(l + 2 * su, 0, 98), clamp(l + su, 0, 98), null, clamp(l - sd, 2, 100), clamp(l - 2 * sd, 2, 100)];
}

/* --------------------------------------------------------- 50-950 scale */

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * OKLCH lightness of each step: the mean of Tailwind CSS v3.4's blue, red,
 * green and violet scales, rounded. The test suite recomputes it from the
 * installed tailwindcss package.
 */
export const SCALE_LIGHTNESS = [0.973, 0.943, 0.897, 0.825, 0.734, 0.647, 0.573, 0.503, 0.437, 0.387, 0.272];
/** Chroma relative to the 500 step, from the same four scales: pale and very dark steps carry less colour. */
export const SCALE_CHROMA = [0.08, 0.17, 0.32, 0.55, 0.81, 1, 1.05, 0.97, 0.82, 0.66, 0.46];

export type ScaleStep = { step: number; hex: string; isBase: boolean };

/**
 * An 11-step 50-950 scale on the base hue in OKLCH. The step whose lightness
 * is closest to the base is replaced by the exact base colour.
 */
export function tailwindScale(base: Rgb): ScaleStep[] {
  const o = rgbToOklch(base);
  let nearest = 0;
  SCALE_LIGHTNESS.forEach((l, i) => {
    if (Math.abs(l - o.l) < Math.abs(SCALE_LIGHTNESS[nearest] - o.l)) nearest = i;
  });
  const peak = o.c / (SCALE_CHROMA[nearest] || 1);
  return SCALE_STEPS.map((step, i) => {
    const isBase = i === nearest;
    const rgb = isBase ? base : oklchToRgb({ l: SCALE_LIGHTNESS[i], c: peak * SCALE_CHROMA[i], h: o.h });
    return { step, hex: rgbToHex(rgb), isBase };
  });
}

/* --------------------------------------------------------------- contrast */

export type ContrastInfo = {
  onWhite: number;
  onBlack: number;
  /** Text colour with the higher contrast on this swatch. */
  bestText: '#ffffff' | '#000000';
  bestRatio: number;
  /** WCAG 2.x level for normal text with the best text colour. */
  level: 'AAA' | 'AA' | 'AA large' | 'Fail';
};

/** WCAG 2.x relative luminance (sRGB, 0.04045 threshold as in IEC 61966-2-1). */
export function luminance(c: Rgb): number {
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

export function contrastBetween(a: Rgb, b: Rgb): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function contrastInfo(c: Rgb): ContrastInfo {
  const onWhite = contrastBetween(c, { r: 255, g: 255, b: 255 });
  const onBlack = contrastBetween(c, { r: 0, g: 0, b: 0 });
  const white = onWhite >= onBlack;
  const best = white ? onWhite : onBlack;
  const level = best >= 7 ? 'AAA' : best >= 4.5 ? 'AA' : best >= 3 ? 'AA large' : 'Fail';
  return { onWhite, onBlack, bestText: white ? '#ffffff' : '#000000', bestRatio: best, level };
}

/** Truncates to two decimals so 4.499 never displays as a passing 4.50. */
export function formatRatio(r: number): string {
  return `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;
}

/* ----------------------------------------------------------------- export */

export function formatRgb(c: Rgb): string {
  return `rgb(${c.r} ${c.g} ${c.b})`;
}
export function formatHsl(h: Hsl): string {
  return `hsl(${Math.round(h.h) % 360} ${Math.round(h.s)}% ${Math.round(h.l)}%)`;
}
export function formatOklch(c: Rgb): string {
  const o = rgbToOklch(c);
  return `oklch(${(o.l * 100).toFixed(1)}% ${o.c.toFixed(3)} ${o.c < 0.0005 ? 0 : o.h.toFixed(1)})`;
}

/** Lower-case, hyphenated CSS identifier ("Brand Blue" -> "brand-blue"). */
export function cssName(name: string): string {
  const n = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(n) ? n : `c-${n || 'color'}`;
}

export function exportCssVariables(palette: PaletteColor[], prefix = 'palette'): string {
  const p = cssName(prefix);
  return [':root {', ...palette.map((c, i) => `  --${p}-${i + 1}: ${c.hex};`), '}'].join('\n');
}

export function exportScaleCss(scale: ScaleStep[], name = 'brand'): string {
  const n = cssName(name);
  return [':root {', ...scale.map((s) => `  --color-${n}-${s.step}: ${s.hex};`), '}'].join('\n');
}

/** Tailwind v3 `theme.extend.colors` block (tailwind.config.js). */
export function exportTailwindConfig(palette: PaletteColor[], scale: ScaleStep[] | null, name = 'brand'): string {
  const n = cssName(name);
  const lines = ['// tailwind.config.js', 'module.exports = {', '  theme: {', '    extend: {', '      colors: {'];
  if (scale) {
    lines.push(`        '${n}': {`);
    scale.forEach((s) => lines.push(`          ${s.step}: '${s.hex}',`));
    lines.push('        },');
  }
  lines.push(`        '${n}-palette': {`);
  palette.forEach((c, i) => lines.push(`          ${i + 1}: '${c.hex}',`));
  lines.push('        },', '      },', '    },', '  },', '};');
  return lines.join('\n');
}

/** Tailwind v4 CSS-first `@theme` block. */
export function exportTailwindTheme(palette: PaletteColor[], scale: ScaleStep[] | null, name = 'brand'): string {
  const n = cssName(name);
  const lines = ['@theme {'];
  scale?.forEach((s) => lines.push(`  --color-${n}-${s.step}: ${s.hex};`));
  palette.forEach((c, i) => lines.push(`  --color-${n}-palette-${i + 1}: ${c.hex};`));
  lines.push('}');
  return lines.join('\n');
}

export function exportScss(palette: PaletteColor[], prefix = 'palette'): string {
  const p = cssName(prefix);
  return palette.map((c, i) => `$${p}-${i + 1}: ${c.hex};`).join('\n');
}

export function exportJson(palette: PaletteColor[], scale: ScaleStep[] | null): string {
  return JSON.stringify(
    {
      palette: palette.map((c) => ({ role: c.role, hex: c.hex, rgb: formatRgb(c.rgb), hsl: formatHsl(c.hsl) })),
      ...(scale ? { scale: Object.fromEntries(scale.map((s) => [s.step, s.hex])) } : {}),
    },
    null,
    2,
  );
}

/* ---------------------------------------------------------- full result */

export type PaletteResult = {
  base: string;
  rule: HarmonyRule;
  wheel: ColorWheel;
  colors: (PaletteColor & { rgbText: string; hslText: string; oklchText: string; contrast: ContrastInfo })[];
  scale: ScaleStep[];
};

/** Everything the page and the MCP tool show, from one base colour. Throws on an unreadable colour. */
export function buildPalette(baseInput: string, rule: HarmonyRule = 'complementary', wheel: ColorWheel = 'rgb'): PaletteResult {
  const base = parseColor(baseInput);
  if (!base) throw new Error(`Could not read the colour "${baseInput}". Use hex (#3b82f6), rgb(), hsl() or oklch().`);
  const colors = harmonyPalette(base, rule, wheel).map((c) => ({
    ...c,
    rgbText: formatRgb(c.rgb),
    hslText: formatHsl(c.hsl),
    oklchText: formatOklch(c.rgb),
    contrast: contrastInfo(c.rgb),
  }));
  return { base: rgbToHex(base), rule, wheel, colors, scale: tailwindScale(base) };
}
