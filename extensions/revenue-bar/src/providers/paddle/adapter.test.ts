import { describe, expect, it } from "vitest";
import { ProviderError } from "../../core/errors";
import { customRange } from "../../core/ranges";
import { fixtureHttp, queryOf } from "../testing";
import { PaddleProvider, adjustmentKind, discountToRule, subscriptionStatus } from "./adapter";
import { PADDLE_VERSION, paddleEnvironment } from "./client";
import page1 from "./__fixtures__/transactions-page1.json";
import page2 from "./__fixtures__/transactions-page2.json";
import adjustments from "./__fixtures__/adjustments.json";
import subscriptions from "./__fixtures__/subscriptions.json";
import canceled from "./__fixtures__/subscriptions-canceled.json";
import discounts from "./__fixtures__/discounts.json";
import customers from "./__fixtures__/customers.json";
import eventTypes from "./__fixtures__/event-types.json";

const range = customRange(new Date("2026-10-08T00:00:00Z"), new Date("2026-10-09T00:00:00Z"), "Test");
const now = () => new Date("2026-10-08T20:00:00Z");
const LIVE_KEY = "pdl_live_apikey_01example_notarealkey";

function setup(extra: Parameters<typeof fixtureHttp>[0] = [], key = LIVE_KEY, pref?: string) {
  const http = fixtureHttp([
    ...extra,
    { match: /\/transactions\?.*after=txn_03eur/, body: page2 },
    { match: "/transactions", body: page1 },
    { match: "/adjustments", body: adjustments },
    { match: /\/subscriptions\?status=canceled/, body: canceled },
    { match: "/subscriptions", body: subscriptions },
    { match: "/discounts", body: discounts },
    { match: "/customers", body: customers },
    { match: "/event-types", body: eventTypes },
  ]);
  return { http, paddle: new PaddleProvider(key, http, pref, now) };
}

describe("environment", () => {
  it("follows the key prefix and falls back to the preference", () => {
    expect(paddleEnvironment("pdl_sdbx_apikey_x", "live")).toBe("sandbox");
    expect(paddleEnvironment("pdl_live_apikey_x", "sandbox")).toBe("live");
    expect(paddleEnvironment("legacy", "sandbox")).toBe("sandbox");
    expect(paddleEnvironment("legacy", undefined)).toBe("live");
  });

  it("uses the sandbox hosts for sandbox keys", async () => {
    const { paddle, http } = setup([], "pdl_sdbx_apikey_abc");
    await paddle.verify();
    expect(http.calls[0]?.url).toBe("https://sandbox-api.paddle.com/event-types");
    expect(paddle.dashboardUrl).toBe("https://sandbox-vendors.paddle.com/transactions-v2");
  });
});

describe("PaddleProvider.sales", () => {
  it("filters by billed_at, includes customers and adjustment totals, and follows the cursor", async () => {
    const { paddle, http } = setup();
    const sales = await paddle.sales(range, { limit: 50 });
    const q = queryOf(http.calls[0]?.url ?? "");
    expect(q["billed_at[GTE]"]).toEqual(["2026-10-08T00:00:00.000Z"]);
    expect(q["billed_at[LT]"]).toEqual(["2026-10-09T00:00:00.000Z"]);
    expect(q.status).toEqual(["completed,paid"]);
    expect(q.include).toEqual(["customer,adjustments_totals"]);
    expect(queryOf(http.calls[1]?.url ?? "").after).toEqual(["txn_03eur"]);
    expect(http.calls[0]?.headers?.["Paddle-Version"]).toBe(PADDLE_VERSION);
    expect(http.calls[0]?.headers?.Authorization).toBe(`Bearer ${LIVE_KEY}`);

    const byId = Object.fromEntries(sales.map((s) => [s.id, s]));
    expect(Object.keys(byId)).not.toContain("txn_09billed");
    expect(byId.txn_01paid).toMatchObject({
      gross: { amountMinor: 1200, currency: "USD" },
      fee: { amountMinor: 110, currency: "USD" },
      net: { amountMinor: 890, currency: "USD" },
      customerEmail: "sam@example.com",
      productName: "AeroEdit Pro",
      status: "paid",
      url: "https://vendors.paddle.com/transactions-v2/txn_01paid",
      isSubscriptionPayment: false,
    });
    expect(byId.txn_02sub?.isSubscriptionPayment).toBe(true);
    expect(byId.txn_03eur).toMatchObject({ gross: { currency: "EUR" }, net: { amountMinor: 1003, currency: "USD" } });
    expect(byId.txn_05refunded?.status).toBe("refunded");
    expect(byId.txn_06partial).toMatchObject({ status: "partially_refunded", refunded: { amountMinor: 1000 } });
    expect(byId.txn_07cb?.status).toBe("disputed");
    expect(byId.txn_08jpy?.gross).toEqual({ amountMinor: 5000, currency: "JPY" });
  });
});

describe("PaddleProvider.summary", () => {
  it("totals transactions and approved refunds in the range", async () => {
    const { paddle, http } = setup();
    const summary = await paddle.summary(range);
    expect(summary.count).toBe(8);
    expect(summary.gross).toEqual([
      { amountMinor: 1190, currency: "EUR" },
      { amountMinor: 5000, currency: "JPY" },
      { amountMinor: 13100, currency: "USD" },
    ]);
    expect(summary.net).toBeUndefined();
    expect(summary.fees).toEqual([{ amountMinor: 1028, currency: "USD" }]);
    expect(summary.refunds).toEqual([{ amountMinor: 1500, currency: "USD" }]);
    // The adjustments page already reaches past the range start, so page 2 is not read.
    expect(http.calls.filter((c) => c.url.includes("/adjustments"))).toHaveLength(1);
  });

  it("reports Paddle errors as ProviderError", async () => {
    const http = fixtureHttp([
      {
        match: "/",
        body: () => {
          throw new ProviderError("paddle", "auth", "Authentication header included, but incorrectly formatted.", {
            status: 403,
          });
        },
      },
    ]);
    const error = await new PaddleProvider(LIVE_KEY, http).summary(range).catch((e) => e);
    expect(error.kind).toBe("auth");
  });
});

describe("PaddleProvider.refunds", () => {
  it("maps refunds, chargebacks and chargeback warnings, skipping credits and unapproved refunds", async () => {
    const { paddle } = setup();
    const refunds = await paddle.refunds(range);
    expect(refunds.map((r) => [r.id, r.kind, r.amount.amountMinor])).toEqual([
      ["adj_06", "refund", 1500],
      ["adj_05", "chargeback", 4000],
      ["adj_02", "dispute", 2000],
    ]);
    expect(refunds[0]?.url).toBe("https://vendors.paddle.com/transactions-v2/txn_05refunded");
  });
});

describe("PaddleProvider.subscriptions", () => {
  it("computes MRR with quantities, overrides, intervals and forever discounts", async () => {
    const { paddle } = setup();
    const subs = await paddle.subscriptions({ cancelledSince: new Date("2026-10-01T00:00:00Z") });
    const byId = Object.fromEntries(subs.map((s) => [s.id, s]));
    expect(Object.keys(byId).sort()).toEqual([
      "sub_churned",
      "sub_eur_override",
      "sub_paused",
      "sub_seats",
      "sub_trial",
      "sub_yearly_disc",
    ]);
    // 10 seats × 30.00 + 100.00 add-on; the one-time item is not recurring.
    expect(byId.sub_seats?.mrr).toEqual({ amountMinor: 40000, currency: "USD" });
    // EUR subscription uses the EUR country override.
    expect(byId.sub_eur_override?.mrr).toEqual({ amountMinor: 700, currency: "EUR" });
    expect(byId.sub_eur_override?.customerEmail).toBe("eu@example.com");
    // 240.00 yearly − 10% forever = 216.00 / 12
    expect(byId.sub_yearly_disc).toMatchObject({ status: "past_due", mrr: { amountMinor: 1800 } });
    expect(byId.sub_trial?.mrr.amountMinor).toBe(0);
    expect(byId.sub_paused?.mrr.amountMinor).toBe(0);
    expect(byId.sub_churned?.cancelledAt?.toISOString()).toBe("2026-10-03T10:00:00.000Z");
    expect(byId.sub_seats?.url).toBe("https://vendors.paddle.com/subscriptions-v2/sub_seats");
  });

  it("still works without customer.read and discount.read", async () => {
    const denied = () => {
      throw new ProviderError("paddle", "auth", "forbidden", { status: 403 });
    };
    const { paddle } = setup([
      { match: "/customers", body: denied },
      { match: "/discounts", body: denied },
    ]);
    const subs = await paddle.subscriptions({ cancelledSince: new Date("2026-10-01T00:00:00Z") });
    const yearly = subs.find((s) => s.id === "sub_yearly_disc");
    expect(yearly?.mrr.amountMinor).toBe(2000);
    expect(yearly?.customerEmail).toBeUndefined();
  });
});

describe("PaddleProvider customers", () => {
  it("searches by exact email", async () => {
    const { paddle, http } = setup();
    const result = await paddle.searchCustomers("sam@example.com");
    expect(queryOf(http.calls[0]?.url ?? "").email).toEqual(["sam@example.com"]);
    expect(result[0]).toMatchObject({
      id: "ctm_01hv8wt8nffez4p2t6typn4a5j",
      url: "https://vendors.paddle.com/customers-v2/ctm_01hv8wt8nffez4p2t6typn4a5j",
    });
  });

  it("lists a customer's transactions", async () => {
    const { paddle, http } = setup();
    await paddle.salesForCustomer({ id: "ctm_01", provider: "paddle", email: "x", url: "" });
    expect(queryOf(http.calls[0]?.url ?? "").customer_id).toEqual(["ctm_01"]);
  });
});

describe("mappings", () => {
  it("maps adjustment actions and subscription statuses", () => {
    expect(adjustmentKind("credit")).toBeUndefined();
    expect(adjustmentKind("chargeback_reverse")).toBeUndefined();
    expect(subscriptionStatus("canceled")).toBe("cancelled");
    expect(subscriptionStatus("something_new")).toBeUndefined();
  });

  it("only applies discounts that recur forever", () => {
    const base = discounts.data[0] as Parameters<typeof discountToRule>[0];
    expect(discountToRule(base)).toEqual({ type: "percent", percent: 10 });
    expect(discountToRule({ ...base, maximum_recurring_intervals: 3 })).toBeUndefined();
    expect(discountToRule({ ...base, recur: false })).toBeUndefined();
    expect(discountToRule({ ...base, type: "flat_per_seat", amount: "500", currency_code: "USD" })).toEqual({
      type: "amount",
      amountMinor: 500,
      currency: "USD",
      perUnit: true,
    });
  });
});
