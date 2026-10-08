import { Money, sumByCurrency } from "./money";
import { Subscription } from "../providers/types";

export type SubscriptionMetrics = {
  mrr: Money[];
  /** Paying subscriptions: active and past due. */
  active: number;
  trialing: number;
  /** Started this month and not in trial. */
  newThisMonth: number;
  churnedThisMonth: number;
};

export function subscriptionMetrics(subs: Subscription[], monthStart: Date): SubscriptionMetrics {
  const paying = subs.filter((s) => s.status === "active" || s.status === "past_due");
  return {
    mrr: sumByCurrency(paying.map((s) => s.mrr)),
    active: paying.length,
    trialing: subs.filter((s) => s.status === "trialing").length,
    newThisMonth: subs.filter((s) => s.status !== "trialing" && s.startedAt >= monthStart).length,
    churnedThisMonth: subs.filter((s) => s.status === "cancelled" && s.cancelledAt && s.cancelledAt >= monthStart)
      .length,
  };
}
