import { describe, expect, it } from "vitest";
import { customRange } from "../../core/ranges";
import { fixtureHttp, queryOf } from "../testing";
import { GumroadProvider, gumroadStatus, refundedCents } from "./adapter";
import { GumroadSale } from "./schemas";
import page1 from "./__fixtures__/sales-page1.json";
import page2 from "./__fixtures__/sales-page2.json";
import byEmail from "./__fixtures__/sales-by-email.json";
import user from "./__fixtures__/user.json";

// Local (America/New_York) 8 October: 04:00Z on the 8th to 04:00Z on the 9th.
const range = customRange(new Date(2026, 9, 8), new Date(2026, 9, 9), "Test");
const now = () => new Date("2026-10-09T03:59:00Z");

function setup() {
  const http = fixtureHttp([
    { match: /\/v2\/sales\?.*email=/, body: byEmail },
    { match: /\/v2\/sales\?.*page_key=/, body: page2 },
    { match: "/v2/sales", body: page1 },
    { match: "/v2/user", body: user },
  ]);
  return { http, gumroad: new GumroadProvider("gumroad-token-abcdef", http, now) };
}

describe("GumroadProvider", () => {
  it("requests the covering UTC date window and follows page keys", async () => {
    const { gumroad, http } = setup();
    await gumroad.summary(range);
    expect(http.calls).toHaveLength(2);
    expect(queryOf(http.calls[0]?.url ?? "")).toEqual({ after: ["2026-10-08"], before: ["2026-10-10"] });
    expect(queryOf(http.calls[1]?.url ?? "").page_key).toEqual(["20261007081040000000-123456"]);
    // The token travels in a header, never in the URL.
    expect(http.calls[0]?.url).not.toContain("gumroad-token");
    expect(http.calls[0]?.headers?.Authorization).toBe("Bearer gumroad-token-abcdef");
  });

  it("summarizes USD cents, Gumroad fees and refunds inside the exact local range", async () => {
    const { gumroad } = setup();
    const summary = await gumroad.summary(range);
    expect(summary.count).toBe(7);
    expect(summary.gross).toEqual([{ amountMinor: 18200, currency: "USD" }]);
    expect(summary.fees).toEqual([{ amountMinor: 1264, currency: "USD" }]);
    expect(summary.net).toEqual([{ amountMinor: 16936, currency: "USD" }]);
    expect(summary.refunds).toEqual([{ amountMinor: 2500, currency: "USD" }]);
    expect(summary.partial).toBe(false);
  });

  it("skips free downloads and sales outside the local day", async () => {
    const { gumroad } = setup();
    const ids = (await gumroad.sales(range, { limit: 50 })).map((s) => s.id);
    expect(ids).toContain("A1==");
    expect(ids).not.toContain("A3==");
    expect(ids).not.toContain("B5==");
  });

  it("maps refunds and chargebacks", async () => {
    const { gumroad } = setup();
    const refunds = await gumroad.refunds(range);
    expect(refunds.map((r) => [r.saleId, r.kind, r.amount.amountMinor])).toEqual([
      ["A4==", "refund", 1500],
      ["B1==", "refund", 1000],
      ["B2==", "chargeback", 4000],
    ]);
  });

  it("marks recurring sales", async () => {
    const { gumroad } = setup();
    const sales = await gumroad.sales(range, { limit: 50 });
    expect(sales.find((s) => s.id === "A2==")?.isSubscriptionPayment).toBe(true);
    expect(sales.find((s) => s.id === "A4==")?.isSubscriptionPayment).toBe(false);
  });

  it("stops reading once the limit is reached", async () => {
    const { gumroad, http } = setup();
    const sales = await gumroad.sales(range, { limit: 3 });
    expect(http.calls).toHaveLength(1);
    expect(sales).toHaveLength(3);
  });

  it("finds a customer by email and totals what they kept paying", async () => {
    const { gumroad, http } = setup();
    const customers = await gumroad.searchCustomers("Calvin@gumroad.com");
    expect(queryOf(http.calls[0]?.url ?? "").email).toEqual(["Calvin@gumroad.com"]);
    expect(customers).toEqual([
      expect.objectContaining({
        email: "calvin@gumroad.com",
        name: "Calvin",
        totalSpent: { amountMinor: 1000, currency: "USD" },
      }),
    ]);
    expect(await gumroad.salesForCustomer(customers[0] as never)).toHaveLength(2);
  });

  it("verifies with /user", async () => {
    const { gumroad, http } = setup();
    await gumroad.verify();
    expect(http.calls[0]?.url).toBe("https://api.gumroad.com/v2/user");
  });

  it("does not offer subscriptions", () => {
    const { gumroad } = setup();
    expect((gumroad as { subscriptions?: unknown }).subscriptions).toBeUndefined();
  });
});

describe("mappings", () => {
  const base = page1.sales[0] as unknown as GumroadSale;
  it("maps statuses", () => {
    expect(gumroadStatus({ ...base, chargedback: true })).toBe("disputed");
    expect(gumroadStatus({ ...base, disputed: true, dispute_won: true })).toBe("paid");
    expect(gumroadStatus({ ...base, refunded: true })).toBe("refunded");
    expect(gumroadStatus({ ...base, partially_refunded: true })).toBe("partially_refunded");
  });

  it("derives partial refunds for USD only", () => {
    expect(
      refundedCents({ ...base, price: 3000, partially_refunded: true, amount_refundable_in_currency: "12.5" }),
    ).toBe(1750);
    expect(
      refundedCents({
        ...base,
        price: 3000,
        partially_refunded: true,
        currency: "eur",
        amount_refundable_in_currency: "12",
      }),
    ).toBeUndefined();
    expect(refundedCents({ ...base, price: 3000, refunded: true })).toBe(3000);
    expect(refundedCents({ ...base, price: 3000 })).toBeUndefined();
  });
});
