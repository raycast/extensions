import Color from "colorjs.io";
import tailwindColors from "./tailwind-colors.json";

/** An sRGB color with channels in the 0–1 range. */
export type RGB = { r: number; g: number; b: number };

/** A parsed user color. `alpha` is kept so semi-transparent text can be blended over its background. */
export type ParsedColor = RGB & { alpha: number; input: string };

export type CopyFormat = "hex" | "oklch" | "rgb" | "tailwind";

const TAILWIND = tailwindColors as Record<string, string>;
const TAILWIND_PREFIXES =
  "text|bg|border|border-[trblxyse]|ring|ring-offset|fill|stroke|from|via|to|outline|decoration|accent|caret|divide|placeholder|shadow|inset-shadow";
const TAILWIND_PATTERN = new RegExp(
  `^(?:[a-z0-9-]+:)*(?:(?:${TAILWIND_PREFIXES})-)?([a-z]+(?:-\\d{2,3})?)(?:\\/(\\d{1,3}))?$`,
);
const BARE_HEX_PATTERN = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Parses any color the user is likely to paste: hex (with or without `#`), rgb(), hsl(), oklch(), CSS names,
 * and Tailwind classes such as `text-slate-500` or `bg-sky-400/50`. Returns `undefined` if it is not a color.
 */
export function parseColor(raw: string | undefined): ParsedColor | undefined {
  if (!raw) return undefined;
  const input = raw
    .trim()
    .replace(/^["'`]|["'`;,]+$/g, "")
    .trim();
  if (!input || input.length > 120) return undefined;

  const tailwind = parseTailwind(input);
  if (tailwind) return tailwind;

  const css = BARE_HEX_PATTERN.test(input) ? `#${input}` : input;
  try {
    const color = new Color(css).to("srgb").toGamut();
    const [r, g, b] = color.coords.map((c) => clamp01(Number(c) || 0));
    const alpha = clamp01(Number(color.alpha ?? 1));
    return { r, g, b, alpha, input };
  } catch {
    return undefined;
  }
}

function parseTailwind(input: string): ParsedColor | undefined {
  const match = TAILWIND_PATTERN.exec(input.toLowerCase());
  if (!match) return undefined;
  const hex = TAILWIND[match[1]];
  if (!hex) return undefined;
  const rgb = hexToRgb(hex);
  const alpha = match[2] ? clamp01(Number(match[2]) / 100) : 1;
  return { ...rgb, alpha, input };
}

/** Blends a (possibly transparent) color over an opaque background, the same way browsers do it in sRGB. */
export function composite(top: ParsedColor | RGB, bottom: RGB): RGB {
  const a = "alpha" in top ? top.alpha : 1;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
  };
}

const WHITE: RGB = { r: 1, g: 1, b: 1 };

/**
 * Resolves what the eye actually sees: a transparent background is shown over white,
 * and a transparent foreground is blended over that background.
 */
export function resolvePair(fg: ParsedColor, bg: ParsedColor): { fg: RGB; bg: RGB } {
  const solidBg = bg.alpha < 1 ? composite(bg, WHITE) : pickRgb(bg);
  const solidFg = fg.alpha < 1 ? composite(fg, solidBg) : pickRgb(fg);
  return { fg: solidFg, bg: solidBg };
}

function pickRgb({ r, g, b }: RGB): RGB {
  return { r, g, b };
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value.slice(0, 6);
  const int = parseInt(full, 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}

/** Converts to 8-bit channels (0–255). */
export function to255({ r, g, b }: RGB): [number, number, number] {
  return [Math.round(clamp01(r) * 255), Math.round(clamp01(g) * 255), Math.round(clamp01(b) * 255)];
}

export function toHex(rgb: RGB): string {
  return `#${to255(rgb)
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function toRgbString(rgb: RGB): string {
  const [r, g, b] = to255(rgb);
  return `rgb(${r} ${g} ${b})`;
}

export function toOklch(rgb: RGB): { l: number; c: number; h: number } {
  const [l, c, h] = new Color("srgb", [rgb.r, rgb.g, rgb.b]).to("oklch").coords;
  return { l: Number(l) || 0, c: Number(c) || 0, h: Number.isFinite(Number(h)) ? Number(h) : 0 };
}

export function toOklchString(rgb: RGB): string {
  const { l, c, h } = toOklch(rgb);
  if (c < 0.0005) return `oklch(${round(l, 3)} 0 0)`;
  return `oklch(${round(l, 3)} ${round(c, 4)} ${round(h, 2)})`;
}

/** Builds an in-gamut sRGB color from OKLCH, reducing chroma when needed (CSS gamut mapping). */
export function fromOklch(l: number, c: number, h: number): RGB {
  const color = new Color("oklch", [clamp01(l), c, h]).to("srgb").toGamut();
  const [r, g, b] = color.coords.map((v) => clamp01(Number(v) || 0));
  // Snap to 8-bit so the checked color is exactly the hex the user copies.
  return hexToRgb(toHex({ r, g, b }));
}

/** Finds the closest Tailwind CSS palette color (by OKLab ΔE). */
export function nearestTailwind(rgb: RGB): { name: string; exact: boolean; hex: string } {
  const hex = toHex(rgb);
  const target = new Color("srgb", [rgb.r, rgb.g, rgb.b]);
  let best = { name: "", distance: Infinity, hex: "" };
  for (const [name, value] of Object.entries(TAILWIND)) {
    if (value === hex) return { name, exact: true, hex: value };
    const distance = target.deltaE(new Color(value), "OK");
    if (distance < best.distance) best = { name, distance, hex: value };
  }
  return { name: best.name, exact: false, hex: best.hex };
}

export function formatColor(rgb: RGB, format: CopyFormat): string {
  switch (format) {
    case "oklch":
      return toOklchString(rgb);
    case "rgb":
      return toRgbString(rgb);
    case "tailwind":
      return nearestTailwind(rgb).name;
    case "hex":
    default:
      return toHex(rgb);
  }
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
