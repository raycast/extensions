/**
 * What happens when the month's private cards are gone, against the trigger
 * that actually refuses them.
 *
 * The allowance is the one refusal a user can act on, so its wording and the
 * upgrade it offers are pinned to the database rather than to a copy of the
 * plan ladder here. The account is seeded with the month already spent,
 * because reaching a ceiling for real would mean generating a month's worth of
 * cards, at a month's worth of OpenAI, TTS and image calls.
 *
 * All three rungs are covered, because the top one reads differently: free and
 * Plus accounts are offered the plan above them, while a Pro account is told
 * when the allowance resets, since there is nothing above Pro. That
 * distinction is what every client keys its Upgrade action off.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readSignInCode, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import { requestCard } from "../../src/lib/card-request-generate";
import { fetchPrivateCardQuota } from "../../src/lib/private-card-quota";
import type { RequestCardResult } from "../../src/types";

/** The rungs of the ladder in `enforce_monthly_private_card_limit`. */
const MONTHLY_LIMIT_BY_PLAN = { free: 50, plus: 300, pro: 1000 } as const;

/** Words the dictionary cannot have, so only the allowance can refuse them. */
const PRIVATE_WORD = "zzzzoverthelimit";
const PUBLIC_WORD = "zzzzstillallowed";

const TEST_WORD_MEANING = "A word invented for a test, which is the sense its card should teach.";

let signedInUserId: string;

/** Narrows a result to the refusal every case here is about. */
function _assertRefused(result: RequestCardResult): Extract<RequestCardResult, { status: "refused" }> {
  if (result.status !== "refused") {
    throw new Error(`Expected a refusal, got "${result.status}"`);
  }
  return result;
}

/**
 * Spends the whole month on a plan, and signs in as the account that spent it,
 * letting go of whichever account the previous case left signed in.
 *
 * The fixture seeds the spent cards as approved requests dated across the
 * month: the allowance counts them, the generator's poller never claims them,
 * and the daily insert ceiling does not fire on a thousand of them.
 *
 * @param plan - Whose allowance to exhaust
 * @returns The signed-in user's id
 */
async function _spendTheMonthAndSignIn(plan: keyof typeof MONTHLY_LIMIT_BY_PLAN): Promise<string> {
  // Reason: the previous case leaves a live session on the same test address,
  // and `resetAccount` deletes the account underneath it. Signing out first
  // means the verify below starts from nothing rather than colliding with a
  // session whose account no longer exists.
  await signOutUser();

  resetAccount({
    email: TEST_ACCOUNT_EMAIL,
    plan,
    profile: "empty",
    spentPrivateCards: MONTHLY_LIMIT_BY_PLAN[plan],
  });

  const requestedAtMs = Date.now();
  await requestEmailCode(TEST_ACCOUNT_EMAIL);
  const signInCode = readSignInCode(TEST_ACCOUNT_EMAIL, requestedAtMs);
  const signedInUser = await verifyEmailCode(TEST_ACCOUNT_EMAIL, signInCode);
  return signedInUser.id;
}

beforeAll(() => {
  assertLocalStackReady();
});

afterAll(async () => {
  await signOutUser();
  // Reason: a Pro month is a thousand seeded rows, and the cases above add
  // asked-for requests of their own. Deleting the account takes all of them,
  // so the next run counts its own allowance rather than this one's.
  resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "empty" });
});

/**
 * The rungs with a plan above them. Their refusals are the same sentence with
 * different numbers, so they are asserted from one place; Pro's is not, which
 * is why it keeps a case of its own below.
 */
const PLANS_WITH_AN_UPGRADE = [
  { plan: "free", planLabel: "Free plan", upgradeOffer: "Upgrade to Plus" },
  { plan: "plus", planLabel: "Plus plan", upgradeOffer: "Upgrade to Pro" },
] as const;

describe.each(PLANS_WITH_AN_UPGRADE)(
  "a $plan account that has used the month's private cards",
  ({ plan, planLabel, upgradeOffer }) => {
    beforeAll(async () => {
      signedInUserId = await _spendTheMonthAndSignIn(plan);
    });

    it("reads the allowance as spent, from the same function the trigger agrees with", async () => {
      // Reason: matched rather than equalled. The function answers with the
      // plan and the tally too; `remaining` is the only column this client reads.
      expect(await fetchPrivateCardQuota()).toMatchObject({ remaining: 0 });
    });

    it("refuses the card in the plan's own words, and says the upgrade is the way past it", async () => {
      const refusal = _assertRefused(await requestCard(signedInUserId, PRIVATE_WORD, TEST_WORD_MEANING, "private"));

      expect(refusal).toMatchObject({ word: PRIVATE_WORD, isPlanLimit: true });
      expect(refusal.reason).toContain(planLabel);
      expect(refusal.reason).toContain(`${MONTHLY_LIMIT_BY_PLAN[plan]} private cards`);
      expect(refusal.reason).toContain(upgradeOffer);
    });

    it("still takes a public request, which the allowance does not count", async () => {
      expect(await requestCard(signedInUserId, PUBLIC_WORD, TEST_WORD_MEANING, "public")).toEqual({
        status: "queued",
        word: PUBLIC_WORD,
      });
    });
  },
);

describe("a pro account that has used the month's private cards", () => {
  beforeAll(async () => {
    signedInUserId = await _spendTheMonthAndSignIn("pro");
  });

  it("is told when the allowance resets rather than sold a plan above Pro", async () => {
    const refusal = _assertRefused(await requestCard(signedInUserId, PRIVATE_WORD, TEST_WORD_MEANING, "private"));

    expect(refusal).toMatchObject({ isPlanLimit: true });
    expect(refusal.reason).toContain("Pro plan");
    expect(refusal.reason).toContain("resets on the 1st");
    // Every client keys its Upgrade action off this: nothing sits above Pro.
    expect(refusal.reason).not.toContain("Upgrade");
  });
});
