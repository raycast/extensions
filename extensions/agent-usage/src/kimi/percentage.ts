import { getRemainingPercent } from "../agents/format";

export { getRemainingPercent };

export function formatRemainingPercent(remaining: number, limit: number): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }
  return `${Math.round(getRemainingPercent(remaining, limit))}% remaining`;
}

/** Returns just the percentage, e.g. "72%" — for use in list accessories. */
export function formatPercentShort(remaining: number, limit: number): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }
  return `${Math.round(getRemainingPercent(remaining, limit))}%`;
}
