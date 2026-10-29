/**
 * The account's plan as the extension reads and describes it, through every
 * state a subscription can be in: the state the modules derive from the row,
 * the header badge built from it, and whether billing is manageable — the
 * inputs `AccountActionSection` chooses its one plan action from.
 *
 * Raycast's rendering cannot be driven, so the action itself is the manual
 * checklist's; this exercises the modules it is built from.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readSignInCode, resetAccount, setSubscription, TEST_ACCOUNT_EMAIL } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import {
  canManageBilling,
  describeAccountHeader,
  describePlanBadge,
  fetchSubscriptionState,
} from "../../src/lib/subscription";

let userId: string;

beforeAll(async () => {
  assertLocalStackReady();
  resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "empty" });
  const requestedAtMs = Date.now();
  await requestEmailCode(TEST_ACCOUNT_EMAIL);
  const user = await verifyEmailCode(TEST_ACCOUNT_EMAIL, readSignInCode(TEST_ACCOUNT_EMAIL, requestedAtMs));
  userId = user.id;
});

afterAll(async () => {
  await signOutUser();
});

/** "1 Sep", as the badge writes the change date. */
const SHORT_DATE_PATTERN = String.raw`\d{1,2} [A-Z][a-z]{2}`;

describe("a free account", () => {
  it("is on Free, with nothing to manage — so the action is Upgrade Plan", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "free");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({
      tier: "free",
      hasLiveStripeSubscription: false,
      isPastDue: false,
      scheduledTier: null,
    });
    expect(canManageBilling(subscriptionState)).toBe(false);
    expect(describePlanBadge(subscriptionState)).toBe("Free");
    expect(describeAccountHeader(TEST_ACCOUNT_EMAIL, subscriptionState)).toBe(`Inoh · ${TEST_ACCOUNT_EMAIL} · Free`);
  });
});

describe("a subscriber", () => {
  it("on an active plan is entitled and sent to Manage Subscription", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "plus", "active");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({
      tier: "plus",
      hasLiveStripeSubscription: true,
      isPastDue: false,
      scheduledTier: null,
    });
    expect(canManageBilling(subscriptionState)).toBe(true);
    expect(describePlanBadge(subscriptionState)).toBe("Plus");
  });

  it("with a pending cancellation keeps the plan and is told when it ends", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "plus", "cancel_pending");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({ tier: "plus", scheduledTier: "free" });
    // `scheduledTier === "free"` is what AccountActionSection turns into Resume Subscription.
    expect(describePlanBadge(subscriptionState)).toMatch(new RegExp(`^Plus · ends ${SHORT_DATE_PATTERN}$`));
  });

  it("with a scheduled downgrade is told which plan comes next", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "pro", "downgrade_pending");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({ tier: "pro", scheduledTier: "plus" });
    expect(canManageBilling(subscriptionState)).toBe(true);
    expect(describePlanBadge(subscriptionState)).toMatch(new RegExp(`^Pro · Plus from ${SHORT_DATE_PATTERN}$`));
  });

  it("whose payment failed is not entitled, but is sent to Fix Payment rather than Upgrade", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "plus", "past_due");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({ tier: "free", hasLiveStripeSubscription: true, isPastDue: true });
    expect(canManageBilling(subscriptionState)).toBe(true);
    expect(describePlanBadge(subscriptionState)).toBe("Free · payment failed");
  });

  it("whose subscription ended is back on Free with nothing left to manage", async () => {
    setSubscription(TEST_ACCOUNT_EMAIL, "plus", "canceled");
    const subscriptionState = await fetchSubscriptionState(userId);
    expect(subscriptionState).toMatchObject({ tier: "free", hasLiveStripeSubscription: false, isPastDue: false });
    expect(canManageBilling(subscriptionState)).toBe(false);
    expect(describePlanBadge(subscriptionState)).toBe("Free");
  });
});
