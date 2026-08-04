import type { AntigravityQuotaGroup } from "./types";

// Third-party model families the Antigravity subscription surfaces as their own
// quota group. These are optional add-ons with separately-allocated pools; their
// (often independently exhausted) limits must not drag the headline badge below
// the health of the first-party Gemini experience the subscription is built around.
const THIRD_PARTY_MARKERS = ["claude", "gpt", "openai", "anthropic"];

function isThirdPartyGroup(group: AntigravityQuotaGroup): boolean {
  const haystack = `${group.displayName} ${group.description ?? ""}`.toLowerCase();
  return THIRD_PARTY_MARKERS.some((marker) => haystack.includes(marker));
}

/**
 * The binding first-party constraint as a single "remaining" percentage for the
 * list accessory. Excludes third-party (Claude / GPT / etc.) quota groups so an
 * account with a healthy Gemini pool reads green even when its separately-allocated
 * third-party pool is exhausted — previously the worst bucket across *all* groups,
 * including third-party, drove the badge to zero.
 *
 * Falls back to the worst bucket across every group when no first-party group
 * remains (e.g. a payload where every group is third-party, or none carries a
 * recognizable marker), so the badge never goes blank.
 */
export function effectiveAntigravityPercent(groups: AntigravityQuotaGroup[]): number {
  const firstParty = groups.filter((group) => !isThirdPartyGroup(group));
  const effectiveGroups = firstParty.length > 0 ? firstParty : groups;
  const percents = effectiveGroups.flatMap((group) => group.buckets).map((bucket) => bucket.percentLeft);
  return percents.length > 0 ? Math.min(...percents) : 100;
}
