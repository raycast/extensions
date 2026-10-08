import { describe, expect, it } from "vitest";
import { ProviderError } from "../../core/errors";
import { customRange } from "../../core/ranges";
import { fixtureHttp, queryOf } from "../testing";
import { StripeProvider, chargeStatus, couponToDiscount, disputeToRefund } from "./adapter";
import { STRIPE_VERSION } from "./client";
import { Charge } from "./schemas";
import page1 from "./__fixtures__/charges-page1.json";
import page2 from "./__fixtures__/charges-page2.json";
import refunds from "./__fixtures__/refunds.json";
import disputes from "./__fixtures__/disputes.json";
import subscriptions from "./__fixtures__/subscriptions.json";
import canceled from "./__fixtures__/subscriptions-canceled.json";
import coupon from "./__fixtures__/coupon-forever20.json";
import customers from "./__fixtures__/customers.json";

const range = customRange(new Date("2026-10-08T00:00:00Z"), new Date("2026-10-09T00:00:00Z"), "Test");
const now = () => new Date("2026-10-08T12:00:00Z");

function setup(extra: Parameters<typeof fixtureHttp>[0] = []) {
  const http = fixtureHttp([
    ...extra,
    { match: /\/v1\/charges\?.*starting_after=ch_jpy/, body: page2 },
    { match: "/v1/charges", body: page1 },
    { match: "/v1/refunds", body: refunds },
    { match: "/v1/disputes", body: disputes },
    { match: /\/v1\/subscriptions\?.*status=canceled/, body: canceled },
    { match: "/v1/subscriptions", body: subscriptions },
    { match: "/v1/coupons/FOREVER20", body: coupon },
    { match: "/v1/customers", body: customers },
  ]);
  return { http, stripe: new StripeProvider("rk_live_testkey123456", http, now) };
}

describe("StripeProvider.sales", () => {
  it("pages with starting_after and normalizes charges", async () => {
    const { stripe, http } = setup();
    const sales = await stripe.sales(range, { limit: 50 });
    expect(http.calls).toHaveLength(2);
    const first = queryOf(http.calls[0]?.url ?? "");
    expect(first["created[gte]"]).toEqual([String(Date.parse("2026-10-08T00:00:00Z") / 1000)]);
    expect(first["expand[]"]).toEqual(["data.balance_transaction", "data.customer"]);
    expect(first.limit).toEqual(["50"]);
    expect(queryOf(http.calls[1]?.url ?? "").starting_after).toEqual(["ch_jpy"]);
    expect(http.calls[0]?.headers?.["Stripe-Version"]).toBe(STRIPE_VERSION);
    expect(http.calls[0]?.headers?.Authorization).toBe("Bearer rk_live_testkey123456");

    const byId = Object.fromEntries(sales.map((s) => [s.id, s]));
    expect(sales.map((s) => s.id)).not.toContain("ch_failed");
    expect(byId.ch_paid).toMatchObject({
      gross: { amountMinor: 1099, currency: "USD" },
      fee: { amountMinor: 62, currency: "USD" },
      net: { amountMinor: 1037, currency: "USD" },
      customerEmail: "jenny@example.com",
      customerName: "Jenny Rosen",
      status: "paid",
      url: "https://dashboard.stripe.com/payments/pi_paid",
      isSubscriptionPayment: false,
    });
    expect(byId.ch_sub).toMatchObject({ isSubscriptionPayment: true, customerEmail: "cust@example.com" });
    // Fee and net settle in USD although the charge was in EUR.
    expect(byId.ch_eur).toMatchObject({
      gross: { amountMinor: 1000, currency: "EUR" },
      net: { amountMinor: 1057, currency: "USD" },
    });
    expect(byId.ch_jpy?.gross).toEqual({ amountMinor: 5000, currency: "JPY" });
    // Stripe sends ISK with two decimals: 50000 = 500 ISK.
    expect(byId.ch_isk?.gross).toEqual({ amountMinor: 500, currency: "ISK" });
    expect(byId.ch_isk?.net).toBeUndefined();
    expect(byId.ch_refunded?.status).toBe("refunded");
    expect(byId.ch_partial).toMatchObject({ status: "partially_refunded", refunded: { amountMinor: 1000 } });
    expect(byId.ch_disputed?.status).toBe("disputed");
    expect(byId.ch_uncaptured?.status).toBe("pending");
    expect(byId.ch_test?.url).toBe("https://dashboard.stripe.com/test/payments/ch_test");
  });

  it("stops at the limit without reading the next page", async () => {
    const { stripe, http } = setup();
    const sales = await stripe.sales(range, { limit: 4 });
    expect(http.calls).toHaveLength(1);
    expect(sales).toHaveLength(4);
  });
});

describe("StripeProvider.summary", () => {
  it("sums collected charges and the range's refunds", async () => {
    const { stripe } = setup();
    const summary = await stripe.summary(range);
    expect(summary.count).toBe(9);
    expect(summary.gross).toEqual([
      { amountMinor: 1000, currency: "EUR" },
      { amountMinor: 500, currency: "ISK" },
      { amountMinor: 5000, currency: "JPY" },
      { amountMinor: 11699, currency: "USD" },
    ]);
    // One charge has no expanded balance transaction, so net is not complete.
    expect(summary.net).toBeUndefined();
    expect(summary.fees).toEqual([
      { amountMinor: 180, currency: "JPY" },
      { amountMinor: 583, currency: "USD" },
    ]);
    // Failed refunds are excluded, pending ones count.
    expect(summary.refunds).toEqual([{ amountMinor: 2500, currency: "USD" }]);
    expect(summary.partial).toBe(false);
  });

  it("flags a partial summary when the page cap is reached", async () => {
    const endless = (url: string) => ({
      ...page1,
      data: [{ ...page1.data[0], id: `ch_${queryOf(url).starting_after?.[0] ?? "0"}x` }],
      has_more: true,
    });
    const { stripe } = setup([{ match: "/v1/charges", body: endless }]);
    expect((await stripe.summary(range)).partial).toBe(true);
  });

  it("surfaces auth errors as ProviderError", async () => {
    const http = fixtureHttp([
      {
        match: "/v1/",
        body: () => {
          throw new ProviderError("stripe", "auth", "Expired API Key provided: rk_live_*********1234", { status: 401 });
        },
      },
    ]);
    const error = await new StripeProvider("rk_live_x", http, now).summary(range).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.kind).toBe("auth");
  });
});

describe("StripeProvider.refunds", () => {
  it("lists refunds and disputes, newest first, and classifies inquiries", async () => {
    const { stripe } = setup();
    const result = await stripe.refunds(range);
    expect(result.map((r) => [r.id, r.kind])).toEqual([
      ["du_1", "chargeback"],
      ["re_1", "refund"],
      ["re_2", "refund"],
      ["du_2", "dispute"],
    ]);
    expect(result[1]).toMatchObject({
      customerEmail: "r@example.com",
      saleId: "ch_refunded",
      url: "https://dashboard.stripe.com/payments/pi_refunded",
      reason: "requested_by_customer",
    });
    expect(result[0]?.url).toBe("https://dashboard.stripe.com/disputes/du_1");
  });
});

describe("StripeProvider.subscriptions", () => {
  it("normalizes MRR across intervals, quantities, discounts and currencies", async () => {
    const { stripe, http } = setup();
    const subs = await stripe.subscriptions({ cancelledSince: new Date("2026-10-01T00:00:00Z") });
    const mrr = Object.fromEntries(subs.map((s) => [s.id, s.mrr]));
    expect(mrr.sub_monthly).toEqual({ amountMinor: 1000, currency: "USD" });
    expect(mrr.sub_yearly).toEqual({ amountMinor: 3000, currency: "USD" }); // 12000 × 3 / 12
    expect(mrr.sub_quarterly).toEqual({ amountMinor: 1000, currency: "USD" }); // past due still counts
    expect(mrr.sub_weekly).toEqual({ amountMinor: 2167, currency: "USD" }); // 500 × 52 / 12
    expect(mrr.sub_trial).toEqual({ amountMinor: 0, currency: "USD" });
    expect(mrr.sub_discount_pct).toEqual({ amountMinor: 1600, currency: "USD" }); // 2 × 1000 − 20% forever
    expect(mrr.sub_discount_once).toEqual({ amountMinor: 1000, currency: "USD" }); // once-only coupon ignored
    expect(mrr.sub_metered).toEqual({ amountMinor: 900, currency: "USD" }); // metered item skipped
    expect(mrr.sub_jpy).toEqual({ amountMinor: 1200, currency: "JPY" });
    expect(subs.map((s) => s.id)).not.toContain("sub_incomplete");
    expect(subs.map((s) => s.id)).not.toContain("sub_old_churn");
    const churned = subs.find((s) => s.id === "sub_churned");
    expect(churned).toMatchObject({ status: "cancelled", mrr: { amountMinor: 0 } });
    expect(churned?.cancelledAt?.toISOString()).toBe("2026-10-05T12:00:00.000Z");
    expect(subs.find((s) => s.id === "sub_monthly")).toMatchObject({
      customerEmail: "m@example.com",
      productName: "Pro",
      interval: "monthly",
      url: "https://dashboard.stripe.com/subscriptions/sub_monthly",
    });
    expect(http.calls.filter((c) => c.url.includes("/coupons/"))).toHaveLength(1);
  });

  it("still returns MRR when the key cannot read coupons", async () => {
    const { stripe } = setup([
      {
        match: "/v1/coupons/",
        body: () => {
          throw new ProviderError("stripe", "auth", "permission", { status: 403 });
        },
      },
    ]);
    const subs = await stripe.subscriptions({ cancelledSince: new Date("2026-10-01T00:00:00Z") });
    expect(subs.find((s) => s.id === "sub_discount_pct")?.mrr.amountMinor).toBe(2000);
  });
});

describe("StripeProvider customers", () => {
  it("searches the typed and lower-case email and dedupes", async () => {
    const { stripe, http } = setup();
    const result = await stripe.searchCustomers("JennyRosen@example.com");
    expect(http.calls.map((c) => queryOf(c.url).email?.[0])).toEqual([
      "JennyRosen@example.com",
      "jennyrosen@example.com",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "cus_NffrFeUfNV2Hib", name: "Jenny Rosen" });
    expect(result[0]?.url).toBe("https://dashboard.stripe.com/customers/cus_NffrFeUfNV2Hib");
  });

  it("lists a customer's charges", async () => {
    const { stripe, http } = setup();
    await stripe.salesForCustomer({ id: "cus_1", provider: "stripe", email: "x@y.z", url: "" });
    expect(queryOf(http.calls[0]?.url ?? "").customer).toEqual(["cus_1"]);
  });

  it("verifies with a one-charge list", async () => {
    const { stripe, http } = setup();
    await stripe.verify();
    expect(http.calls[0]?.url).toBe("https://api.stripe.com/v1/charges?limit=1");
  });
});

describe("mappings", () => {
  const base = page1.data[0] as unknown as Charge;
  it("maps charge statuses", () => {
    expect(chargeStatus({ ...base, status: "failed" })).toBeUndefined();
    expect(chargeStatus({ ...base, status: "pending" })).toBe("pending");
    expect(chargeStatus({ ...base, disputed: true, refunded: true })).toBe("disputed");
  });

  it("only keeps forever coupons", () => {
    expect(couponToDiscount({ id: "a", duration: "forever", percent_off: 10 })).toEqual({
      type: "percent",
      percent: 10,
    });
    expect(couponToDiscount({ id: "b", duration: "forever", amount_off: 500, currency: "usd" })).toEqual({
      type: "amount",
      amountMinor: 500,
      currency: "USD",
    });
    expect(couponToDiscount({ id: "c", duration: "repeating", percent_off: 10 })).toBeUndefined();
  });

  it("links test-mode disputes to the test dashboard", () => {
    const refund = disputeToRefund({ ...disputes.data[0], livemode: false } as never, true);
    expect(refund.url).toBe("https://dashboard.stripe.com/test/disputes/du_1");
  });
});
