import { describe, expect, it } from "vitest";
import { CACHE_KEYS, memoryStore, readJson, writeJson } from "./cache";
import { CSV_HEADERS, csvCell, exportFileName, salesToCsv } from "./csv";
import { ProviderError, describeErrorKind, redact, registerSecret, serializeError } from "./errors";
import { applyDiscounts, intervalLabel, monthlyFactor, parseInterval, toMonthly } from "./mrr";
import { Sale } from "../providers/types";

describe("mrr", () => {
  it("normalizes intervals to one month", () => {
    const amount = { amountMinor: 12000, currency: "USD" };
    expect(toMonthly(amount, "month")).toEqual({ amountMinor: 12000, currency: "USD" });
    expect(toMonthly(amount, "year")).toEqual({ amountMinor: 1000, currency: "USD" });
    expect(toMonthly(amount, "month", 3)).toEqual({ amountMinor: 4000, currency: "USD" });
    expect(toMonthly(amount, "month", 6)).toEqual({ amountMinor: 2000, currency: "USD" });
    expect(toMonthly(amount, "year", 2)).toEqual({ amountMinor: 500, currency: "USD" });
    expect(toMonthly({ amountMinor: 1000, currency: "USD" }, "week")).toEqual({ amountMinor: 4333, currency: "USD" });
    expect(toMonthly({ amountMinor: 1000, currency: "USD" }, "week", 2)).toEqual({
      amountMinor: 2167,
      currency: "USD",
    });
    expect(toMonthly({ amountMinor: 100, currency: "USD" }, "day")).toEqual({ amountMinor: 3042, currency: "USD" });
  });

  it("treats a zero or negative interval count as 1", () => {
    expect(monthlyFactor("month", 0)).toBe(1);
    expect(monthlyFactor("year", -1)).toBeCloseTo(1 / 12);
  });

  it("parses known intervals only", () => {
    expect(parseInterval("year")).toBe("year");
    expect(parseInterval("fortnight")).toBeUndefined();
    expect(parseInterval(null)).toBeUndefined();
  });

  it("applies percent and fixed discounts and never goes negative", () => {
    const amount = { amountMinor: 10000, currency: "USD" };
    expect(applyDiscounts(amount, 1, [{ type: "percent", percent: 20 }])).toEqual({
      amountMinor: 8000,
      currency: "USD",
    });
    expect(applyDiscounts(amount, 1, [{ type: "amount", amountMinor: 2500, currency: "USD" }]).amountMinor).toBe(7500);
    expect(
      applyDiscounts(amount, 4, [{ type: "amount", amountMinor: 1000, currency: "USD", perUnit: true }]).amountMinor,
    ).toBe(6000);
    expect(applyDiscounts(amount, 1, [{ type: "amount", amountMinor: 2500, currency: "EUR" }]).amountMinor).toBe(10000);
    expect(applyDiscounts(amount, 1, [{ type: "amount", amountMinor: 99999, currency: "USD" }]).amountMinor).toBe(0);
    expect(applyDiscounts(amount, 1, [{ type: "percent", percent: 150 }]).amountMinor).toBe(0);
  });

  it("labels intervals", () => {
    expect(intervalLabel("month")).toBe("monthly");
    expect(intervalLabel("year")).toBe("yearly");
    expect(intervalLabel("month", 3)).toBe("quarterly");
    expect(intervalLabel("week", 2)).toBe("every 2 weeks");
  });
});

describe("csv", () => {
  it("quotes and neutralizes formulas", () => {
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(true)).toBe("true");
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@sum")).toBe("'@sum");
  });

  it("writes one row per sale with major-unit amounts", () => {
    const sale: Sale = {
      id: "ch_1",
      provider: "stripe",
      createdAt: new Date("2026-10-08T12:00:00Z"),
      gross: { amountMinor: 1099, currency: "EUR" },
      fee: { amountMinor: 52, currency: "USD" },
      net: { amountMinor: 1180, currency: "USD" },
      customerEmail: "a@b.co",
      customerName: "Doe, Jane",
      productName: "Pro",
      status: "paid",
      url: "https://dashboard.stripe.com/payments/ch_1",
      isSubscriptionPayment: true,
    };
    const csv = salesToCsv([sale]);
    const [header, row, trailing] = csv.split("\r\n");
    expect(header).toBe(CSV_HEADERS.join(","));
    expect(row).toBe(
      '2026-10-08T12:00:00.000Z,Stripe,ch_1,paid,EUR,10.99,,0.52,11.8,USD,a@b.co,"Doe, Jane",Pro,true,https://dashboard.stripe.com/payments/ch_1',
    );
    expect(trailing).toBe("");
  });

  it("names export files by range and local date, avoiding collisions", () => {
    const now = new Date(2026, 9, 8, 23, 30);
    expect(exportFileName("Last 7 Days", now)).toBe("revenue-bar-sales-last-7-days-2026-10-08.csv");
    const taken = new Set(["revenue-bar-sales-today-2026-10-08.csv", "revenue-bar-sales-today-2026-10-08-2.csv"]);
    expect(exportFileName("Today", now, (n) => taken.has(n))).toBe("revenue-bar-sales-today-2026-10-08-3.csv");
  });

  it("writes only the header for no sales", () => {
    expect(salesToCsv([])).toBe(`${CSV_HEADERS.join(",")}\r\n`);
  });
});

describe("errors", () => {
  it("redacts known key shapes", () => {
    expect(redact("key rk_live_51ABCdef")).toBe("key [redacted]");
    expect(redact("key sk_test_abc")).toBe("key [redacted]");
    expect(redact("pdl_sdbx_apikey_01example_notarealkey")).toBe("[redacted]");
    expect(redact("Authorization: Bearer abc.def-ghi")).toBe("Authorization: [redacted]");
    expect(redact("/v2/sales?access_token=xyz&page=2")).toBe("/v2/sales?access_token=[redacted]&page=2");
    expect(redact("license 38b1460a-5104-4067-a91d-77b872934d51 bad")).toBe("license [redacted] bad");
  });

  it("redacts registered secrets of any shape", () => {
    registerSecret("gumroad-token-value-1234");
    expect(redact("failed with gumroad-token-value-1234")).toBe("failed with [redacted]");
    registerSecret("abc"); // too short to register safely
    expect(redact("abc")).toBe("abc");
  });

  it("serializes errors to plain objects", () => {
    expect(serializeError(new ProviderError("stripe", "auth", "nope", { status: 401 }))).toEqual({
      provider: "stripe",
      kind: "auth",
      message: "nope",
      status: 401,
    });
    expect(serializeError(new Error("plain"))).toEqual({ kind: "unknown", message: "plain" });
    expect(serializeError(7)).toEqual({ kind: "unknown", message: "7" });
    expect(describeErrorKind("rate_limit")).toMatch(/Rate limited/);
  });
});

describe("cache helpers", () => {
  it("round-trips JSON and ignores bad data", () => {
    const store = memoryStore();
    const isNumberArray = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");
    writeJson(store, "k", [1, 2]);
    expect(readJson(store, "k", isNumberArray)).toEqual([1, 2]);
    store.set("bad", "{not json");
    expect(readJson(store, "bad", isNumberArray)).toBeUndefined();
    writeJson(store, "wrong", { a: 1 });
    expect(readJson(store, "wrong", isNumberArray)).toBeUndefined();
    expect(readJson(store, "missing", isNumberArray)).toBeUndefined();
    store.remove("k");
    expect(store.get("k")).toBeUndefined();
    expect(CACHE_KEYS.fxRates("EUR")).toBe("fx-rates-EUR");
  });
});
