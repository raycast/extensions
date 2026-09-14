import { getRemainingPercent } from "../agents/format.ts";
import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";

export { getRemainingPercent };

export function formatRemainingPercent(remaining: number, limit: number, mode: PercentageDisplayMode): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }
  return `${Math.round(toDisplayPercent(getRemainingPercent(remaining, limit), mode))}% ${mode}`;
}

/** Returns just the percentage, e.g. "72%" — for use in list accessories. */
export function formatPercentShort(remaining: number, limit: number, mode: PercentageDisplayMode): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }
  return `${Math.round(toDisplayPercent(getRemainingPercent(remaining, limit), mode))}%`;
}
