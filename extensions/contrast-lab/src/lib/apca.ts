// APCA (Accessible Perceptual Contrast Algorithm) lightness contrast and the
// font-size/weight threshold lookup.

import { calcAPCA, fontLookupAPCA } from "apca-w3";
import type { ApcaResult, ApcaWeight } from "./contrast";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * `fontLookupAPCA` marks any weight that is "not usable for fluent text" at the
 * current Lc with a sentinel value of 777 (or larger).
 */
export const APCA_FONT_SENTINEL = 777;

/** Signed APCA lightness contrast (Lc), rounded to 2dp. Negative = light text on dark bg. */
export function apcaLc(fg: string, bg: string): number {
  return round2(calcAPCA(fg, bg));
}

/**
 * Minimum usable font size (px) for `weight` at the given absolute Lc, or `null`
 * if APCA considers that weight unusable for fluent text at this contrast.
 */
export function minFontSize(absLc: number, weight: ApcaWeight): number | null {
  // Lookup row is [lcString, w100, w200, ..., w900]; weight W maps to index W/100.
  const row = fontLookupAPCA(absLc);
  const px = Number(row[weight / 100]);
  return px >= APCA_FONT_SENTINEL ? null : px;
}

/** Full APCA evaluation for a given foreground/background and text style. */
export function evaluateApca(fg: string, bg: string, fontSizePx: number, fontWeight: ApcaWeight): ApcaResult {
  const lc = apcaLc(fg, bg);
  const absLc = Math.abs(lc);
  const minFontPx = minFontSize(absLc, fontWeight);
  const passesAtSize = minFontPx !== null && fontSizePx >= minFontPx;
  return { lc, absLc, minFontPx, passesAtSize };
}
