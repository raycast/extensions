import { supabase } from "./supabase";

/** The plan slugs stored in `subscriptions.plan`. */
export type SubscriptionTier = "free" | "plus" | "pro";

/** Human name for each tier — the "Plus" in "Inoh Plus". */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

/**
 * What the extension knows about the signed-in account's plan. Mirrors the
 * Inoh Obsidian plugin and Chrome extension, minus the renewal dates they
 * print — Raycast shows the plan as a badge and nothing more.
 */
export type SubscriptionState = {
  /** The tier the user is entitled to right now; "free" when a paid plan lapsed. */
  tier: SubscriptionTier;
  /**
   * A Stripe subscription exists that can still bill or recover — including
   * `past_due`, where the user is not entitled but does need the billing
   * portal to fix their card.
   */
  hasLiveStripeSubscription: boolean;
};

const FREE_SUBSCRIPTION: SubscriptionState = {
  tier: "free",
  hasLiveStripeSubscription: false,
};

/** The columns of `subscriptions` the extension reads. */
type SubscriptionRow = {
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
};

/** Statuses where a paid plan is entitled — the backend's predicate, verbatim. */
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

/** Statuses where Stripe still has a subscription that can bill or recover. */
const LIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Whether a tier is entitled to paid features.
 *
 * @param tier - The tier the user is on right now
 * @returns True for Plus and Pro
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

/**
 * Whether the account should be sent to billing management rather than the
 * plans page: subscribers change their plan there, and a `past_due` account
 * reads as free but still needs the portal to fix its card.
 *
 * @param state - The account's subscription state
 * @returns True when "Manage Subscription" is the right action
 */
export function canManageBilling(state: SubscriptionState): boolean {
  return isPaidTier(state.tier) || state.hasLiveStripeSubscription;
}

/**
 * Reads the signed-in user's subscription state.
 *
 * A paid plan (`plus` or `pro`) is entitled while its status is `active` or
 * `trialing` — the same predicate the backend uses everywhere. RLS restricts
 * the read to the caller's own row.
 *
 * @param userId - The signed-in user's id
 * @returns The plan state, or the free defaults when there is no row
 * @throws {Error} When the query fails — callers must not show "Free" for a
 *   read that never happened, since that is indistinguishable from not paying
 */
export async function fetchSubscriptionState(userId: string): Promise<SubscriptionState> {
  const { data: subscriptionRow, error } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    throw new Error(error.message);
  }
  if (!subscriptionRow) {
    return FREE_SUBSCRIPTION;
  }

  const isPaidPlan = subscriptionRow.plan === "plus" || subscriptionRow.plan === "pro";
  const isEntitledPaidPlan = isPaidPlan && ENTITLED_STATUSES.has(subscriptionRow.status);
  const hasLiveStripeSubscription =
    Boolean(subscriptionRow.stripe_subscription_id) && LIVE_STRIPE_STATUSES.has(subscriptionRow.status);

  return {
    tier: isEntitledPaidPlan ? (subscriptionRow.plan as SubscriptionTier) : "free",
    hasLiveStripeSubscription,
  };
}
