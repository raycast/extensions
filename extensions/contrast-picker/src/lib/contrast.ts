import { APCAcontrast, fontLookupAPCA, sRGBtoY } from "apca-w3";
import { RGB, to255 } from "./color";

export type WcagLevel = "aa" | "aaa";
export type FixTarget = WcagLevel | "apca";
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export const FONT_WEIGHTS: FontWeight[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

/** APCA result for a minimum font size. */
export type ApcaFont =
  | { kind: "size"; px: number }
  | { kind: "nonText" } // Lc is only enough for icons, borders and other non-text elements
  | { kind: "invisible" }; // Lc is too low for anything

function linearize(channel: number): number {
  // WCAG 2.2 uses the corrected sRGB threshold 0.04045.
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance (0–1). */
export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.x contrast ratio, from 1 to 21. Order of colors does not matter. */
export function wcagRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * WCAG "large text": at least 18pt (24px), or at least 14pt (≈18.66px) and bold (700+).
 */
export function isLargeText(sizePx: number, weight: number): boolean {
  return sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
}

export function requiredRatio(level: WcagLevel, large: boolean): number {
  if (level === "aa") return large ? 3 : 4.5;
  return large ? 4.5 : 7;
}

export function passesWcag(ratio: number, level: WcagLevel, large: boolean): boolean {
  // Round down to 2 decimals the same way checkers display it, so 4.499 never shows as a pass.
  return Math.floor(ratio * 100) / 100 >= requiredRatio(level, large);
}

/** Signed APCA Lc. Positive = dark text on light background, negative = light text on dark background. */
export function apcaLc(text: RGB, background: RGB): number {
  return Number(APCAcontrast(sRGBtoY(to255(text)), sRGBtoY(to255(background))));
}

/** Minimum font size for this Lc and weight, from the APCA (0.1.7 G) lookup table. */
export function apcaMinFont(lc: number, weight: FontWeight): ApcaFont {
  const row = fontLookupAPCA(Math.abs(lc));
  const value = Number(row[weight / 100]);
  if (value >= 999) return { kind: "invisible" };
  if (value >= 777) return { kind: "nonText" };
  return { kind: "size", px: value };
}

/**
 * The smallest |Lc| at which text of this size and weight is readable, or `undefined`
 * when no contrast is enough (for example 12px at weight 100).
 */
export function apcaRequiredLc(sizePx: number, weight: FontWeight): number | undefined {
  const key = `${sizePx}:${weight}`;
  if (requiredLcCache.has(key)) return requiredLcCache.get(key);
  let result: number | undefined;
  for (let lc = 15; lc <= 125; lc += 0.5) {
    const font = apcaMinFont(lc, weight);
    if (font.kind === "size" && font.px <= sizePx) {
      result = lc;
      break;
    }
  }
  requiredLcCache.set(key, result);
  return result;
}

const requiredLcCache = new Map<string, number | undefined>();

export type ContrastReport = {
  ratio: number;
  large: boolean;
  aa: boolean;
  aaa: boolean;
  /** AA / AAA results for both text sizes, for the badges. */
  levels: { aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean };
  lc: number;
  apcaFont: ApcaFont;
  apcaRequired: number | undefined;
  apcaPass: boolean;
};

export function analyze(fg: RGB, bg: RGB, sizePx: number, weight: FontWeight): ContrastReport {
  const ratio = wcagRatio(fg, bg);
  const large = isLargeText(sizePx, weight);
  const lc = apcaLc(fg, bg);
  const apcaRequired = apcaRequiredLc(sizePx, weight);
  return {
    ratio,
    large,
    aa: passesWcag(ratio, "aa", large),
    aaa: passesWcag(ratio, "aaa", large),
    levels: {
      aaNormal: passesWcag(ratio, "aa", false),
      aaLarge: passesWcag(ratio, "aa", true),
      aaaNormal: passesWcag(ratio, "aaa", false),
      aaaLarge: passesWcag(ratio, "aaa", true),
    },
    lc,
    apcaFont: apcaMinFont(lc, weight),
    apcaRequired,
    apcaPass: apcaRequired !== undefined && Math.abs(lc) >= apcaRequired,
  };
}

/** Tells if a pair passes the chosen target at this text size. */
export function passesTarget(fg: RGB, bg: RGB, target: FixTarget, sizePx: number, weight: FontWeight): boolean {
  if (target === "apca") {
    const required = apcaRequiredLc(sizePx, weight);
    return required !== undefined && Math.abs(apcaLc(fg, bg)) >= required;
  }
  return passesWcag(wcagRatio(fg, bg), target, isLargeText(sizePx, weight));
}

export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

export function formatLc(lc: number): string {
  return Math.abs(lc).toFixed(2);
}

export function polarityLabel(lc: number): string {
  if (lc === 0) return "no contrast";
  return lc > 0 ? "dark text on light" : "light text on dark";
}

export function targetLabel(target: FixTarget): string {
  return target === "apca" ? "APCA" : `WCAG ${target.toUpperCase()}`;
}
