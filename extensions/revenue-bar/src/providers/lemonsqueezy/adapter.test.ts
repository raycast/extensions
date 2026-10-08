import { describe, expect, it } from "vitest";
import { customRange } from "../../core/ranges";
import { fixtureHttp, queryOf } from "../testing";
import {
  LemonSqueezyProvider,
  invoiceToSale,
  mapOrderStatus,
  mapSubscriptionStatus,
  priceAmountMinor,
} from "./adapter";
import { PriceAttributes } from "./schemas";
import orders from "./__fixtures__/orders-page1.json";
import invoices from "./__fixtures__/subscription-invoices.json";
import subscriptions from "./__fixtures__/subscriptions.json";
import price101 from "./__fixtures__/price-101.json";
import price102 from "./__fixtures__/price-102.json";
import price103 from "./__fixtures__/price-103.json";
import store from "./__fixtures__/store-1.json";
import customers from "./__fixtures__/customers.json";

const range = customRange(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-08T00:00:00Z"), "Test");
const now = () => new Date("2026-10-08T00:00:00Z");

function provider(extra: Parameters<typeof fixtureHttp>[0] = []) {
  const http = fixtureHttp([
    ...extra,
    { match: "/v1/orders", body: orders },
    { match: "/v1/subscription-invoices", body: invoices },
    { match: "/v1/subscriptions", body: subscriptions },
    { match: "/v1/prices/101", body: price101 },
    { match: "/v1/prices/102", body: price102 },
    { match: "/v1/prices/103", body: price103 },
    { match: "/v1/stores/1", body: store },
    { match: "/v1/customers", body: customers },
  ]);
  return { http, ls: new LemonSqueezyProvider("ls-test-key-123456", http, now) };
}

describe("LemonSqueezyProvider.sales", () => {
  it("normalizes orders and renewal invoices inside the range", async () => {
    const { ls, http } = provider();
    const sales = await ls.sales(range, { limit: 50 });
    expect(sales.map((s) => s.id)).toEqual(["6", "invoice-13", "5", "4", "2"]);

    const [paid, renewal, partial, refunded, pending] = sales;
    expect(paid).toMatchObject({
      gross: { amountMinor: 1199, currency: "USD" },
      status: "paid",
      customerEmail: "john@example.com",
      productName: "Icon Pack",
      url: "https://app.lemonsqueezy.com/orders/6",
      isSubscriptionPayment: false,
    });
    expect(renewal).toMatchObject({ isSubscriptionPayment: true, gross: { amountMinor: 999, currency: "USD" } });
    expect(partial).toMatchObject({ status: "partially_refunded", refunded: { amountMinor: 500, currency: "EUR" } });
    // JPY is zero-decimal: 1500 means ¥1,500.
    expect(refunded).toMatchObject({ status: "refunded", gross: { amountMinor: 1500, currency: "JPY" } });
    expect(pending?.status).toBe("pending");

    const headers = http.calls[0]?.headers;
    expect(headers?.Authorization).toBe("Bearer ls-test-key-123456");
    expect(headers?.Accept).toBe("application/vnd.api+json");
  });

  it("stops paging once a page reaches past the range start", async () => {
    const { ls, http } = provider();
    await ls.summary(range);
    const orderCalls = http.calls.filter((c) => c.url.includes("/v1/orders"));
    // Page 1 already contains an order from September, so page 2 of 3 is never requested.
    expect(orderCalls).toHaveLength(1);
    expect(queryOf(orderCalls[0]?.url ?? "")).toMatchObject({ "page[number]": ["1"], "page[size]": ["100"] });
  });

  it("follows pages while every order is inside the range", async () => {
    const recent = { ...orders, data: orders.data.slice(0, 1), meta: { page: { ...orders.meta.page, lastPage: 2 } } };
    const lastPage = { ...orders, data: [], meta: { page: { ...orders.meta.page, currentPage: 2, lastPage: 2 } } };
    const { ls, http } = provider([
      { match: /\/v1\/orders\?page\[number\]=1/, body: recent },
      { match: /\/v1\/orders\?page\[number\]=2/, body: lastPage },
    ]);
    const summary = await ls.summary(range);
    expect(http.calls.filter((c) => c.url.includes("/v1/orders"))).toHaveLength(2);
    expect(summary.partial).toBe(false);
  });

  it("marks the summary partial when the page cap is hit", async () => {
    const endless = (url: string) => ({
      ...orders,
      data: orders.data.slice(0, 1),
      meta: { page: { ...orders.meta.page, currentPage: Number(queryOf(url)["page[number]"]?.[0]), lastPage: 999 } },
    });
    const { ls } = provider([{ match: "/v1/orders", body: endless }]);
    const summary = await ls.summary(range);
    expect(summary.partial).toBe(true);
  });
});

describe("LemonSqueezyProvider.summary", () => {
  it("totals collected sales per currency and refunds on them", async () => {
    const { ls } = provider();
    const summary = await ls.summary(range);
    expect(summary.count).toBe(4);
    expect(summary.gross).toEqual([
      { amountMinor: 2000, currency: "EUR" },
      { amountMinor: 1500, currency: "JPY" },
      { amountMinor: 2198, currency: "USD" },
    ]);
    expect(summary.refunds).toEqual([
      { amountMinor: 500, currency: "EUR" },
      { amountMinor: 1500, currency: "JPY" },
    ]);
    expect(summary.net).toBeUndefined();
    expect(summary.fetchedAt).toEqual(now());
  });
});

describe("LemonSqueezyProvider.refunds", () => {
  it("dates full refunds by refunded_at and partial ones by updated_at", async () => {
    const { ls } = provider();
    const refunds = await ls.refunds(range);
    expect(refunds.map((r) => [r.saleId, r.createdAt.toISOString(), r.status])).toEqual([
      ["4", "2026-10-06T10:00:00.000Z", "full"],
      ["5", "2026-10-05T09:30:00.000Z", "partial"],
    ]);
    expect(refunds.every((r) => r.kind === "refund")).toBe(true);
  });
});

describe("LemonSqueezyProvider.subscriptions", () => {
  it("computes MRR from prices, normalized to monthly", async () => {
    const { ls, http } = provider();
    const subs = await ls.subscriptions({ cancelledSince: new Date("2026-10-01T00:00:00Z") });
    const byId = Object.fromEntries(subs.map((s) => [s.id, s]));
    expect(Object.keys(byId).sort()).toEqual(["10", "12", "7", "8", "9"]);
    expect(byId["7"]?.mrr).toEqual({ amountMinor: 999, currency: "USD" });
    // 12000 yearly × 2 seats = 24000 / 12
    expect(byId["8"]?.mrr).toEqual({ amountMinor: 2000, currency: "USD" });
    expect(byId["8"]?.interval).toBe("yearly");
    // Graduated: 2 × 1000 + 3 × 500 = 3500 every 3 months → 1167 per month. Past due still counts.
    expect(byId["12"]).toMatchObject({ status: "past_due", mrr: { amountMinor: 1167, currency: "USD" } });
    expect(byId["9"]).toMatchObject({ status: "trialing", mrr: { amountMinor: 0, currency: "USD" } });
    expect(byId["10"]).toMatchObject({ status: "cancelled", mrr: { amountMinor: 0, currency: "USD" } });
    expect(byId["10"]?.cancelledAt?.toISOString()).toBe("2026-10-02T08:00:00.000Z");
    // Each price and the store are fetched once.
    expect(http.calls.filter((c) => c.url.includes("/prices/101"))).toHaveLength(1);
    expect(http.calls.filter((c) => c.url.includes("/stores/1"))).toHaveLength(1);
  });
});

describe("LemonSqueezyProvider customers", () => {
  it("searches by email and reads total revenue", async () => {
    const { ls, http } = provider();
    const result = await ls.searchCustomers(" sam@example.com ");
    expect(queryOf(http.calls[0]?.url ?? "")["filter[email]"]).toEqual(["sam@example.com"]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "20",
        email: "sam@example.com",
        totalSpent: { amountMinor: 84332, currency: "USD" },
        url: "https://app.lemonsqueezy.com/customers/20",
      }),
    ]);
  });

  it("lists a customer's orders", async () => {
    const { ls, http } = provider();
    const sales = await ls.salesForCustomer({
      id: "20",
      provider: "lemonsqueezy",
      email: "sam@example.com",
      url: "",
    });
    expect(queryOf(http.calls[0]?.url ?? "")["filter[user_email]"]).toEqual(["sam@example.com"]);
    expect(sales.length).toBeGreaterThan(0);
  });

  it("verifies the key with a one-item store list", async () => {
    const { ls, http } = provider([{ match: "/v1/stores?", body: { ...customers, data: [] } }]);
    await ls.verify();
    expect(http.calls[0]?.url).toBe("https://api.lemonsqueezy.com/v1/stores?page[size]=1");
  });
});

describe("mappings", () => {
  it("maps order statuses and drops failed ones", () => {
    expect(mapOrderStatus("paid")).toBe("paid");
    expect(mapOrderStatus("partial_refund")).toBe("partially_refunded");
    expect(mapOrderStatus("refunded")).toBe("refunded");
    expect(mapOrderStatus("failed")).toBeUndefined();
    expect(mapOrderStatus("fraudulent")).toBeUndefined();
  });

  it("maps subscription statuses", () => {
    expect(mapSubscriptionStatus("on_trial")).toBe("trialing");
    expect(mapSubscriptionStatus("unpaid")).toBe("past_due");
    expect(mapSubscriptionStatus("expired")).toBe("cancelled");
  });

  it("skips initial invoices, which duplicate the checkout order", () => {
    const initial = invoices.data[1]?.attributes;
    expect(initial?.billing_reason).toBe("initial");
    expect(invoiceToSale("12", initial as Parameters<typeof invoiceToSale>[1])).toBeUndefined();
  });

  it("prices every scheme", () => {
    const base: PriceAttributes = { scheme: "standard", unit_price: 1000, package_size: 1 };
    expect(priceAmountMinor(base, 3)).toBe(3000);
    expect(priceAmountMinor({ ...base, unit_price: null, unit_price_decimal: "12.5" }, 2)).toBe(25);
    expect(priceAmountMinor({ ...base, unit_price: null }, 2)).toBeUndefined();
    expect(priceAmountMinor({ ...base, scheme: "package", package_size: 10 }, 11)).toBe(2000);
    const tiers = [
      { last_unit: 5, unit_price: 1000, fixed_fee: 100 },
      { last_unit: "inf" as const, unit_price: 800, fixed_fee: 0 },
    ];
    expect(priceAmountMinor({ ...base, scheme: "volume", tiers }, 3)).toBe(3100);
    expect(priceAmountMinor({ ...base, scheme: "volume", tiers }, 6)).toBe(4800);
    expect(priceAmountMinor({ ...base, scheme: "graduated", tiers }, 7)).toBe(5100 + 1600);
    expect(priceAmountMinor({ ...base, scheme: "volume", tiers: [] }, 1)).toBeUndefined();
  });
});
