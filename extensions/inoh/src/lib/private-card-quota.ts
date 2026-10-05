import { supabase } from "./supabase";

/**
 * How many private cards this month's allowance has left.
 *
 * Read from the `private_card_quota` function rather than counted here, so the
 * number a user is shown comes from the same ladder the trigger enforces:
 * Free 50, Plus 300, Pro 1,000, reset on the 1st.
 */

/**
 * What a caller reads of the allowance. The function also returns the plan it
 * came from, what has been used, and the monthly limit; none of them is read
 * here, because the refusal names the plan and its limit in its own words.
 *
 * @see supabase/migrations/20260913020000_card_request_drafts.sql
 */
export type PrivateCardQuota = {
  remaining: number;
};

/**
 * Reads the signed-in user's private card allowance.
 *
 * @returns The allowance, or null when it could not be read
 */
export async function fetchPrivateCardQuota(): Promise<PrivateCardQuota | null> {
  // Reason: a failed read is not worth a toast. The allowance only decorates
  // the form, and the database refuses a request over the limit regardless.
  const { data: quota } = await supabase.rpc("private_card_quota").single<PrivateCardQuota>();

  return quota ?? null;
}

/**
 * Below this, the tally is worth saying out loud.
 *
 * Reason: the same threshold and the same reasoning as `describeLowAllowance`
 * in the web app and inoh-mcp. At 47 of 50 the tally is noise, because no
 * decision hangs on it. Near the end it is a real heads-up, because the next
 * card may be refused.
 */
const LOW_ALLOWANCE_THRESHOLD = 5;

const NO_CARDS_LEFT_MESSAGE = "No cards left this month. The allowance resets on the 1st.";

/** What is left, once few enough to be worth saying. */
function _buildCardsLeftMessage(remainingCardCount: number): string {
  const cardLabel = remainingCardCount === 1 ? "1 card" : `${remainingCardCount} cards`;
  return `Only ${cardLabel} left this month.`;
}

/**
 * A sentence about the allowance, or null when it is not worth saying.
 *
 * @param remainingCardCount - Cards left this month, or null when unknown
 * @returns A line to show under the generate action, or null to say nothing
 */
export function describeLowAllowance(remainingCardCount: number | null): string | null {
  if (remainingCardCount === null || remainingCardCount > LOW_ALLOWANCE_THRESHOLD) return null;
  if (remainingCardCount === 0) return NO_CARDS_LEFT_MESSAGE;
  return _buildCardsLeftMessage(remainingCardCount);
}
