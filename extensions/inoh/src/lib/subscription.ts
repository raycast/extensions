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
 * Inoh Obsidian plugin and Chrome extension: the entitled tier, whether
 * Stripe still has a subscription, and the one pending change (PRI-20493) so
 * the badge can say "ends 1 Sep" instead of lying with a bare "Plus".
 */
export type SubscriptionState = {
  /** The tier the user is entitled to right now; "free" when a paid plan lapsed. */
  tier: SubscriptionTier;
  /**
   * A Stripe subscription exists that can still bill or recover — including
   * `past_due`, where the user is not entitled but does need to fix their card.
   */
  hasLiveStripeSubscription: boolean;
  /** The last payment failed; the plan is on hold until the card is fixed. */
  isPastDue: boolean;
  /** Plan the subscription moves to at period end; null when nothing is pending. */
  scheduledTier: SubscriptionTier | null;
  /** ISO timestamp of the current period end (renewal or change date). */
  currentPeriodEnd: string | null;
};

const FREE_SUBSCRIPTION: SubscriptionState = {
  tier: "free",
  hasLiveStripeSubscription: false,
  isPastDue: false,
  scheduledTier: null,
  currentPeriodEnd: null,
};

/** The columns of `subscriptions` the extension reads. */
type SubscriptionRow = {
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  scheduled_plan: string | null;
  current_period_end: string | null;
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
 * reads as free but still needs to fix its card.
 *
 * @param state - The account's subscription state
 * @returns True when "Manage Subscription" is the right action
 */
export function canManageBilling(state: SubscriptionState): boolean {
  return isPaidTier(state.tier) || state.hasLiveStripeSubscription;
}

const isTier = (value: string | null): value is SubscriptionTier =>
  value === "free" || value === "plus" || value === "pro";

const formatPeriodEnd = (isoDate: string | null): string | null =>
  isoDate ? new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

/**
 * The plan badge for the command header: the tier, plus the one thing that
 * changes it ("Plus · ends 1 Sep", "Pro · Plus from 1 Sep", "Plus · payment failed").
 *
 * @param state - The account's subscription state
 * @returns The badge text
 */
export function describePlanBadge(state: SubscriptionState): string {
  const tierName = TIER_DISPLAY_NAMES[state.tier];
  const periodEnd = formatPeriodEnd(state.currentPeriodEnd);
  if (state.isPastDue) return `${tierName} · payment failed`;
  if (state.scheduledTier === "free") return periodEnd ? `${tierName} · ends ${periodEnd}` : tierName;
  if (state.scheduledTier && periodEnd) {
    return `${tierName} · ${TIER_DISPLAY_NAMES[state.scheduledTier]} from ${periodEnd}`;
  }
  return tierName;
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
    .select("plan, status, stripe_subscription_id, scheduled_plan, current_period_end")
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
    isPastDue: subscriptionRow.status === "past_due",
    scheduledTier: isTier(subscriptionRow.scheduled_plan) ? subscriptionRow.scheduled_plan : null,
    currentPeriodEnd: subscriptionRow.current_period_end,
  };
}
