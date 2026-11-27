import { clampPercent } from "./format";
import { LimitWindow } from "./types";

export interface Pace {
  /** Linear share of the window that has elapsed, as a percentage. */
  expectedUsedPercent: number;
  /** Positive = consuming faster than an even spread, negative = quota in reserve. */
  deltaPercent: number;
  /** Whether the current burn rate lasts until the window resets. */
  willLastToReset: boolean;
  /** When the quota runs out at the current burn rate, if before the reset. */
  runsOutAt?: Date;
}

/** Ignore the first 2% of a window: the projection is noise right after a reset. */
const MIN_ELAPSED_FRACTION = 0.02;

/**
 * Projects consumption linearly over the window, the same model CodexBar uses for its
 * "Expected X% used" hint. Returns undefined when the window has no known length or reset.
 */
export function computePace(window: LimitWindow, now: Date = new Date()): Pace | undefined {
  if (!window.resetsAt || !window.windowMinutes || window.windowMinutes <= 0) return undefined;

  const totalMs = window.windowMinutes * 60_000;
  const remainingMs = window.resetsAt.getTime() - now.getTime();
  if (remainingMs <= 0 || remainingMs > totalMs) return undefined;

  const elapsedMs = totalMs - remainingMs;
  const elapsedFraction = elapsedMs / totalMs;
  const used = clampPercent(window.usedPercent);
  const expectedUsedPercent = Math.round(elapsedFraction * 100);
  const deltaPercent = Math.round(used - elapsedFraction * 100);

  if (used >= 100) {
    return { expectedUsedPercent, deltaPercent, willLastToReset: false, runsOutAt: now };
  }
  if (used <= 0 || elapsedFraction < MIN_ELAPSED_FRACTION) {
    return { expectedUsedPercent, deltaPercent, willLastToReset: true };
  }

  const percentPerMs = used / elapsedMs;
  const msToExhaust = (100 - used) / percentPerMs;
  if (msToExhaust >= remainingMs) {
    return { expectedUsedPercent, deltaPercent, willLastToReset: true };
  }
  return {
    expectedUsedPercent,
    deltaPercent,
    willLastToReset: false,
    runsOutAt: new Date(now.getTime() + msToExhaust),
  };
}

export function paceSummary(pace: Pace): string {
  const delta = Math.abs(pace.deltaPercent);
  if (delta === 0) return "On pace";
  return pace.deltaPercent < 0 ? `${delta}% in reserve` : `${delta}% ahead of pace`;
}
