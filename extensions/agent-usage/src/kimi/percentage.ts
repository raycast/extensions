import { getRemainingPercent, getRemainingPercentOrNull } from "../agents/format.ts";
import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";

export { getRemainingPercent, getRemainingPercentOrNull };

export function formatRemainingPercent(remaining: number, limit: number, mode: PercentageDisplayMode): string {
  const percentRemaining = getRemainingPercentOrNull(remaining, limit);
  if (percentRemaining === null) {
    return "--";
  }
  return `${Math.round(toDisplayPercent(percentRemaining, mode))}% ${mode}`;
}

/** Returns just the percentage, e.g. "72%" — for use in list accessories. */
export function formatPercentShort(remaining: number, limit: number, mode: PercentageDisplayMode): string {
  const percentRemaining = getRemainingPercentOrNull(remaining, limit);
  if (percentRemaining === null) {
    return "--";
  }
  return `${Math.round(toDisplayPercent(percentRemaining, mode))}%`;
}
