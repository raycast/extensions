import { describe, expect, it } from "vitest";
import { subscriptionMetrics } from "./subscriptions";
import { Subscription } from "../providers/types";

const monthStart = new Date("2026-10-01T04:00:00Z");

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: "s",
    provider: "stripe",
    status: "active",
    mrr: { amountMinor: 1000, currency: "USD" },
    startedAt: new Date("2026-06-01T00:00:00Z"),
    url: "",
    ...partial,
  };
}

describe("subscriptionMetrics", () => {
  it("counts paying, trialing, new and churned subscriptions", () => {
    const metrics = subscriptionMetrics(
      [
        sub({ id: "a" }),
        sub({ id: "b", status: "past_due", mrr: { amountMinor: 500, currency: "EUR" } }),
        sub({ id: "c", startedAt: new Date("2026-10-05T00:00:00Z") }),
        sub({
          id: "d",
          status: "trialing",
          mrr: { amountMinor: 0, currency: "USD" },
          startedAt: new Date("2026-10-06T00:00:00Z"),
        }),
        sub({
          id: "e",
          status: "cancelled",
          mrr: { amountMinor: 0, currency: "USD" },
          cancelledAt: new Date("2026-10-02T00:00:00Z"),
        }),
        sub({
          id: "f",
          status: "cancelled",
          mrr: { amountMinor: 0, currency: "USD" },
          cancelledAt: new Date("2026-09-30T00:00:00Z"),
        }),
        sub({ id: "g", status: "paused", mrr: { amountMinor: 0, currency: "USD" } }),
      ],
      monthStart,
    );
    expect(metrics).toEqual({
      mrr: [
        { amountMinor: 500, currency: "EUR" },
        { amountMinor: 2000, currency: "USD" },
      ],
      active: 3,
      trialing: 1,
      newThisMonth: 1,
      churnedThisMonth: 1,
    });
  });

  it("handles no subscriptions", () => {
    expect(subscriptionMetrics([], monthStart)).toEqual({
      mrr: [],
      active: 0,
      trialing: 0,
      newThisMonth: 0,
      churnedThisMonth: 0,
    });
  });
});
