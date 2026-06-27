// WCAG 2.x contrast ratio and AA/AAA level checks.

import { wcagContrast, type CuloriColor } from "culori";
import type { WcagResult } from "./contrast";

/** WCAG 2.x level thresholds (contrast ratio). */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AAA_NORMAL = 7;
export const WCAG_AAA_LARGE = 4.5;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Raw, unrounded WCAG contrast ratio (1..21). Used internally by the fixer's search. */
export function rawRatio(fg: string | CuloriColor, bg: string | CuloriColor): number {
  return wcagContrast(fg, bg);
}

/** WCAG contrast ratio rounded to 2dp. Accepts strings (incl. `oklch()`) or color objects. */
export function contrastRatio(fg: string | CuloriColor, bg: string | CuloriColor): number {
  return round2(rawRatio(fg, bg));
}

/** Full WCAG evaluation: 2dp ratio plus AA/AAA pass flags (compared against the shown ratio). */
export function evaluateWcag(fg: string, bg: string): WcagResult {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio,
    aaNormal: ratio >= WCAG_AA_NORMAL,
    aaLarge: ratio >= WCAG_AA_LARGE,
    aaaNormal: ratio >= WCAG_AAA_NORMAL,
    aaaLarge: ratio >= WCAG_AAA_LARGE,
  };
}
