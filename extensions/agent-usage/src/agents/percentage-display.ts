/**
 * Percentage display mode support.
 *
 * Providers report quota percentages as "remaining". The global
 * "Percentage Display" preference lets users flip every displayed quota
 * percentage to "used" (100 − remaining) instead. Currency amounts, credits,
 * and balance values are unaffected.
 *
 * This module is intentionally free of @raycast/api imports so it stays
 * testable under `node --test`; the preference itself is read by
 * `getPercentageDisplayMode()` in agents/ui.tsx.
 */

export type PercentageDisplayMode = "remaining" | "used";

/**
 * Converts a remaining percentage into the value to display for the given mode.
 * In "used" mode the result is 100 − remaining, clamped to [0, 100] and
 * normalized to avoid float artifacts (100 − 66.6 → 33.4, not 33.400000000000006).
 */
export function toDisplayPercent(percentageRemaining: number, mode: PercentageDisplayMode): number {
  if (mode !== "used") return percentageRemaining;
  const used = Math.min(100, Math.max(0, 100 - percentageRemaining));
  return Number(used.toFixed(4));
}

/**
 * Formats a remaining percentage as "58% remaining" or "42% used" per the mode.
 * Pass a custom `format` to control number rendering (e.g. toFixed(1)).
 */
export function formatPercentDisplay(
  percentageRemaining: number,
  mode: PercentageDisplayMode,
  format: (value: number) => string = String,
): string {
  return `${format(toDisplayPercent(percentageRemaining, mode))}% ${mode}`;
}
