import type { AmpUsage } from "./types.ts";

/**
 * Remaining percent for the Amp list/menu-bar badge.
 *
 * Amp Free stays the primary badge when it is present, matching the previous
 * single-pool UI. Subscription-only output has no Amp Free pool; using 0% for
 * that absence would paint a red exhausted pie next to valid subscription
 * remaining in the tooltip and details. Fall back to the tighter of the
 * subscription other/orb windows instead.
 */
export function effectiveRemainingPercent(usage: AmpUsage): number | null {
  if (usage.ampFree) {
    return usage.ampFree.percentRemaining;
  }
  if (usage.subscription) {
    return Math.min(usage.subscription.otherPercentRemaining, usage.subscription.orbPercentRemaining);
  }
  return null;
}
