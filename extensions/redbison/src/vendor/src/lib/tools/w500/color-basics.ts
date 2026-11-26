/**
 * The small colour arithmetic three tools were each doing for themselves.
 *
 * contrast-check and color-convert carried their own copy of hexToRgb, and
 * the copies had already drifted: one threw `Invalid hex: #zz`, the other
 * `Invalid hex`. Two implementations of sRGB luminance is one more than the
 * number of correct answers, so they live here, where the page, the MCP
 * handler and the editors all reach the same one.
 *
 * Nothing here takes a dependency, which is what lets the CLI and the
 * extensions answer these without a network call.
 *
 * The relative-luminance and contrast-ratio formulas are WCAG 2.2, Appendix
 * A ("relative luminance", "contrast ratio"):
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

export class ColorInputError extends Error {}

export type Rgb = [number, number, number];

/** `#abc` and `#aabbcc`, with or without the hash. */
export function hexToRgb(hex: string): Rgb {
  const h = hex.replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new ColorInputError(`Invalid hex: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function rgbToHsl(r: number, g: number, b: number): Rgb {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/** WCAG relative luminance. */
export function luminance(rgb: number[]): number {
  const [R, G, B] = rgb.slice(0, 3).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export type ContrastReport = {
  ratio: number;
  normalText: { AA: boolean; AAA: boolean };
  largeText: { AA: boolean; AAA: boolean };
};

/**
 * The WCAG contrast ratio of two hex colours, with the four pass/fail calls.
 *
 * The thresholds are compared against the exact ratio and the figure is
 * rounded only for display: rounding first makes 4.4999 pass AA, which is a
 * wrong answer on an accessibility report somebody files.
 */
export function contrastReport(foreground: string, background: string): ContrastReport {
  const fg = luminance(hexToRgb(foreground));
  const bg = luminance(hexToRgb(background));
  const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  return {
    ratio: Math.floor(ratio * 100) / 100,
    normalText: { AA: ratio >= 4.5, AAA: ratio >= 7 },
    largeText: { AA: ratio >= 3, AAA: ratio >= 4.5 },
  };
}

export type ColorForms = {
  hex: string;
  rgb: string;
  hsl: string;
  components: { r: number; g: number; b: number; h: number; s: number; l: number };
};

/** One colour, written every way: `#3B82F6`, `rgb(...)` or `hsl(...)` in. */
export function colorForms(input: string): ColorForms {
  const s = String(input ?? '').trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (s.startsWith('#')) {
    [r, g, b] = hexToRgb(s);
  } else {
    const rgbMatch = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    const hslMatch = s.match(/^hsla?\(\s*(\d+)[,\s]+(\d+)%?[,\s]+(\d+)%?/i);
    if (rgbMatch) [r, g, b] = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    else if (hslMatch) [r, g, b] = hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
    else throw new ColorInputError('Unrecognized color format');
  }
  const [h, sat, l] = rgbToHsl(r, g, b);
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${h}, ${sat}%, ${l}%)`,
    components: { r, g, b, h, s: sat, l },
  };
}

/** The CSS gradient string, from the stops as written. */
export function gradientCss(type: 'linear' | 'radial', stops: string[], angle = 90): string {
  const joined = stops.join(', ');
  return type === 'linear' ? `linear-gradient(${angle}deg, ${joined})` : `radial-gradient(circle, ${joined})`;
}
