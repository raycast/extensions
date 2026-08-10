import type { CodexUsage } from "./types";

/**
 * The binding rate-limit constraint as a single "remaining" percentage for the
 * list accessory. The accessory previously surfaced only the 5-hour window,
 * which can read green/healthy while the weekly (or code-review) window is
 * exhausted. Returns the worst applicable window so the badge reflects what the
 * account can actually spend.
 *
 * Credits are intentionally excluded: Codex subscription plans routinely report
 * a zero credit balance while remaining fully usable through their rate-limit
 * windows, so factoring credits in would flag healthy accounts as exhausted.
 */
export function effectiveRemainingPercent(usage: CodexUsage): number {
  const windows: number[] = [];
  if (usage.fiveHourLimit) windows.push(usage.fiveHourLimit.percentageRemaining);
  if (usage.weeklyLimit) windows.push(usage.weeklyLimit.percentageRemaining);
  if (usage.codeReviewLimit) windows.push(usage.codeReviewLimit.percentageRemaining);
  if (windows.length === 0) return 0;
  const effective = Math.min(...windows);
  return Math.max(0, Math.min(100, effective));
}
