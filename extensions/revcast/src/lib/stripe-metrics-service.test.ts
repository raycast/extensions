import { describe, expect, it } from "vitest";

import { StripeSubscription } from "./stripe";
import {
  buildRevenueSnapshot,
  calculateMRR,
  calculatePercentDelta,
  sumSucceededPaymentIntents,
} from "./stripe-metrics-service";

function createSubscription(
  unitAmount: number,
  interval: "day" | "week" | "month" | "year",
  intervalCount = 1,
  status = "active",
): StripeSubscription {
  return {
    id: `sub_${unitAmount}_${interval}_${intervalCount}`,
    status,
    items: {
      data: [
        {
          price: {
            unit_amount: unitAmount,
            currency: "usd",
            recurring: {
              interval,
              interval_count: intervalCount,
            },
          },
        },
      ],
    },
  };
}

describe("calculateMRR", () => {
  it("normalizes mixed billing intervals into monthly revenue", () => {
    const subscriptions: StripeSubscription[] = [
      createSubscription(5000, "month"),
      createSubscription(120000, "year"),
      createSubscription(1200, "week"),
      createSubscription(300, "day"),
    ];

    expect(calculateMRR(subscriptions)).toBeCloseTo(29325, 0);
  });

  it("ignores inactive subscriptions and missing recurring prices", () => {
    const subscriptions: StripeSubscription[] = [
      createSubscription(5000, "month", 1, "canceled"),
      {
        id: "sub_missing_price",
        status: "active",
        items: {
          data: [
            {
              price: {
                unit_amount: null,
                currency: "usd",
                recurring: null,
              },
            },
          ],
        },
      },
    ];

    expect(calculateMRR(subscriptions)).toBe(0);
  });
});

describe("sumSucceededPaymentIntents", () => {
  it("sums only successful payments and prefers amount_received", () => {
    const total = sumSucceededPaymentIntents([
      { status: "succeeded", amount: 1000, amount_received: 900 },
      { status: "processing", amount: 2000, amount_received: 0 },
      { status: "succeeded", amount: 3000, amount_received: 0 },
    ]);

    expect(total).toBe(3900);
  });
});

describe("calculatePercentDelta", () => {
  it("returns null when the comparison baseline is zero", () => {
    expect(calculatePercentDelta(1000, 0)).toBeNull();
  });

  it("calculates the relative change", () => {
    expect(calculatePercentDelta(1250, 1000)).toBe(25);
  });
});

describe("buildRevenueSnapshot", () => {
  it("builds the full snapshot from raw Stripe data", () => {
    const snapshot = buildRevenueSnapshot({
      subscriptions: [
        createSubscription(9900, "month"),
        createSubscription(120000, "year"),
      ],
      todayPaymentIntents: [
        {
          status: "succeeded",
          amount: 4900,
          amount_received: 4900,
          currency: "usd",
        },
        {
          status: "requires_payment_method",
          amount: 1900,
          amount_received: 0,
          currency: "usd",
        },
      ],
      yesterdayPaymentIntents: [
        {
          status: "succeeded",
          amount: 3500,
          amount_received: 3500,
          currency: "usd",
        },
      ],
      customers: [{ id: "cus_1" }, { id: "cus_2" }],
      failedPayments: [
        {
          id: "in_1",
          customerName: "Acme Co",
          customerEmail: "ops@acme.co",
          amount: 2900,
          currency: "usd",
          retryAt: null,
          status: "final",
          reason: "Final failure",
          stripeUrl: "https://dashboard.stripe.com/invoices/in_1",
          reviewed: false,
        },
      ],
    });

    expect(snapshot.currency).toBe("usd");
    expect(snapshot.todayRevenue).toBe(4900);
    expect(snapshot.mrr).toBe(19900);
    expect(snapshot.newCustomers).toBe(2);
    expect(snapshot.failedPaymentsCount).toBe(1);
    expect(snapshot.revenueAtRisk).toBe(2900);
    expect(snapshot.todayRevenueContext).toBe("1 successful payments today");
    expect(snapshot.todayRevenueDelta).toBe(40);
  });
});
