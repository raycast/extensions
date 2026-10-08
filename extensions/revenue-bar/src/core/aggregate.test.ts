import { describe, expect, it } from "vitest";
import {
  combineSummaries,
  failures,
  mergeSales,
  refundAmounts,
  settleAll,
  successes,
  summarizeSales,
} from "./aggregate";
import { ProviderError } from "./errors";
import { customRange } from "./ranges";
import { Provider, Refund, Sale, Summary } from "../providers/types";

const range = customRange(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-08T00:00:00Z"), "Test");
const now = new Date("2026-10-08T00:00:00Z");

function sale(partial: Partial<Sale>): Sale {
  return {
    id: "s",
    provider: "stripe",
    createdAt: new Date("2026-10-02T00:00:00Z"),
    gross: { amountMinor: 1000, currency: "USD" },
    status: "paid",
    url: "https://example.test",
    isSubscriptionPayment: false,
    ...partial,
  };
}

function summary(partial: Partial<Summary>): Summary {
  return {
    provider: "stripe",
    range,
    gross: [],
    refunds: [],
    count: 0,
    partial: false,
    fetchedAt: now,
    ...partial,
  };
}

describe("summarizeSales", () => {
  it("counts collected sales, including refunded ones, and skips pending", () => {
    const result = summarizeSales({
      provider: "stripe",
      range,
      sales: [
        sale({ id: "1", net: { amountMinor: 941, currency: "USD" }, fee: { amountMinor: 59, currency: "USD" } }),
        sale({
          id: "2",
          status: "refunded",
          net: { amountMinor: 941, currency: "USD" },
          fee: { amountMinor: 59, currency: "USD" },
        }),
        sale({ id: "3", status: "pending" }),
        sale({ id: "4", gross: { amountMinor: 500, currency: "EUR" }, net: { amountMinor: 480, currency: "EUR" } }),
      ],
      refunds: [{ amountMinor: 1000, currency: "USD" }],
      partial: false,
      now,
    });
    expect(result.count).toBe(3);
    expect(result.gross).toEqual([
      { amountMinor: 500, currency: "EUR" },
      { amountMinor: 2000, currency: "USD" },
    ]);
    expect(result.net).toEqual([
      { amountMinor: 480, currency: "EUR" },
      { amountMinor: 1882, currency: "USD" },
    ]);
    expect(result.fees).toEqual([{ amountMinor: 118, currency: "USD" }]);
    expect(result.refunds).toEqual([{ amountMinor: 1000, currency: "USD" }]);
  });

  it("leaves net undefined when any sale has no net", () => {
    const result = summarizeSales({
      provider: "lemonsqueezy",
      range,
      sales: [sale({ net: { amountMinor: 900, currency: "USD" } }), sale({})],
      refunds: [],
      partial: true,
      now,
    });
    expect(result.net).toBeUndefined();
    expect(result.fees).toBeUndefined();
    expect(result.partial).toBe(true);
  });

  it("returns empty totals for no sales", () => {
    const result = summarizeSales({ provider: "paddle", range, sales: [], refunds: [], partial: false, now });
    expect(result.gross).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.net).toBeUndefined();
  });
});

describe("refundAmounts", () => {
  it("only counts refunds, not disputes", () => {
    const refunds: Refund[] = [
      {
        id: "r",
        provider: "stripe",
        createdAt: now,
        amount: { amountMinor: 100, currency: "USD" },
        url: "",
        kind: "refund",
      },
      {
        id: "d",
        provider: "stripe",
        createdAt: now,
        amount: { amountMinor: 900, currency: "USD" },
        url: "",
        kind: "dispute",
      },
    ];
    expect(refundAmounts(refunds)).toEqual([{ amountMinor: 100, currency: "USD" }]);
  });
});

describe("combineSummaries", () => {
  const a = summary({
    provider: "stripe",
    gross: [{ amountMinor: 10000, currency: "USD" }],
    net: [{ amountMinor: 9500, currency: "USD" }],
    refunds: [{ amountMinor: 1000, currency: "USD" }],
    count: 2,
  });
  const b = summary({
    provider: "lemonsqueezy",
    gross: [{ amountMinor: 8913, currency: "EUR" }],
    refunds: [],
    count: 1,
    partial: true,
  });

  it("adds per currency and converts to the display currency", () => {
    const combined = combineSummaries([a, b], {
      rates: { base: "USD", date: "2026-10-08", rates: { EUR: 0.8913 }, fetchedAt: 0 },
      stale: false,
    });
    expect(combined.count).toBe(3);
    expect(combined.partial).toBe(true);
    expect(combined.net).toBeUndefined();
    expect(combined.providers).toEqual(["stripe", "lemonsqueezy"]);
    expect(combined.converted?.gross.total).toEqual({ amountMinor: 20000, currency: "USD" });
    expect(combined.converted?.refunds.total).toEqual({ amountMinor: 1000, currency: "USD" });
    expect(combined.converted?.ratesDate).toBe("2026-10-08");
  });

  it("does not need rates when everything is in the display currency", () => {
    const combined = combineSummaries([a], { displayCurrency: "USD" });
    expect(combined.converted?.gross.total).toEqual({ amountMinor: 10000, currency: "USD" });
    expect(combined.converted?.net?.total).toEqual({ amountMinor: 9500, currency: "USD" });
  });

  it("leaves conversion out when rates are missing for mixed currencies", () => {
    expect(combineSummaries([a, b], { displayCurrency: "USD" }).converted).toBeUndefined();
    expect(combineSummaries([]).count).toBe(0);
  });
});

describe("settleAll", () => {
  const ok = { id: "stripe" } as Provider;
  const bad = { id: "paddle" } as Provider;

  it("keeps successful providers when another fails, and redacts the error", async () => {
    const results = await settleAll([ok, bad], async (p) => {
      if (p.id === "paddle") throw new ProviderError("paddle", "auth", "bad key pdl_live_apikey_secretvalue123");
      return 42;
    });
    expect(successes(results)).toEqual([42]);
    const failed = failures(results);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.provider).toBe("paddle");
    expect(failed[0]?.error.kind).toBe("auth");
    expect(failed[0]?.error.message).not.toContain("secretvalue");
  });

  it("serializes non-ProviderError failures", async () => {
    const results = await settleAll([ok], async () => {
      throw "boom";
    });
    expect(results[0]).toEqual({ provider: "stripe", ok: false, error: { kind: "unknown", message: "boom" } });
  });
});

describe("mergeSales", () => {
  it("sorts newest first and limits", () => {
    const older = sale({ id: "old", createdAt: new Date("2026-10-01T00:00:00Z") });
    const newer = sale({ id: "new", provider: "paddle", createdAt: new Date("2026-10-03T00:00:00Z") });
    const middle = sale({ id: "mid", createdAt: new Date("2026-10-02T00:00:00Z") });
    expect(mergeSales([[older, middle], [newer]]).map((s) => s.id)).toEqual(["new", "mid", "old"]);
    expect(mergeSales([[older, middle], [newer]], 1).map((s) => s.id)).toEqual(["new"]);
  });
});
