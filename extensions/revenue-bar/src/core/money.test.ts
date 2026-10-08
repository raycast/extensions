import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatMoneyList,
  fromMajor,
  fromProviderMinor,
  isoExponent,
  parseIntegerString,
  stripeExponent,
  sumByCurrency,
  toMajor,
} from "./money";

describe("isoExponent", () => {
  it("knows two, zero and three decimal currencies", () => {
    expect(isoExponent("USD")).toBe(2);
    expect(isoExponent("eur")).toBe(2);
    expect(isoExponent("JPY")).toBe(0);
    expect(isoExponent("KRW")).toBe(0);
    expect(isoExponent("KWD")).toBe(3);
    expect(isoExponent("BHD")).toBe(3);
  });

  it("uses ISO minor units, not display digits", () => {
    expect(isoExponent("HUF")).toBe(2);
    expect(isoExponent("TWD")).toBe(2);
    expect(isoExponent("ISK")).toBe(0);
    expect(isoExponent("UGX")).toBe(0);
    expect(isoExponent("CLF")).toBe(4);
  });

  it("falls back to 2 for unknown codes", () => {
    expect(isoExponent("??")).toBe(2);
  });
});

describe("stripeExponent", () => {
  it("follows Stripe's currency table", () => {
    expect(stripeExponent("usd")).toBe(2);
    expect(stripeExponent("jpy")).toBe(0);
    expect(stripeExponent("krw")).toBe(0);
    expect(stripeExponent("kwd")).toBe(3);
    // Special cases: zero-decimal in ISO but sent with two decimals.
    expect(stripeExponent("isk")).toBe(2);
    expect(stripeExponent("ugx")).toBe(2);
    expect(stripeExponent("huf")).toBe(2);
    expect(stripeExponent("twd")).toBe(2);
  });
});

describe("fromProviderMinor", () => {
  it("keeps amounts whose provider and ISO exponent agree", () => {
    expect(fromProviderMinor(1099, "usd", 2)).toEqual({ amountMinor: 1099, currency: "USD" });
    expect(fromProviderMinor(500, "jpy", 0)).toEqual({ amountMinor: 500, currency: "JPY" });
    expect(fromProviderMinor(1234, "kwd", 3)).toEqual({ amountMinor: 1234, currency: "KWD" });
  });

  it("rescales Stripe's two-decimal ISK and UGX to whole units", () => {
    expect(fromProviderMinor(500, "isk", stripeExponent("isk"))).toEqual({ amountMinor: 5, currency: "ISK" });
    expect(fromProviderMinor(250000, "ugx", stripeExponent("ugx"))).toEqual({ amountMinor: 2500, currency: "UGX" });
  });

  it("keeps HUF with two decimals", () => {
    expect(fromProviderMinor(1045, "huf", stripeExponent("huf"))).toEqual({ amountMinor: 1045, currency: "HUF" });
  });
});

describe("conversions", () => {
  it("converts between major and minor units", () => {
    expect(toMajor({ amountMinor: 1099, currency: "USD" })).toBe(10.99);
    expect(toMajor({ amountMinor: 1099, currency: "JPY" })).toBe(1099);
    expect(toMajor({ amountMinor: 1234, currency: "KWD" })).toBe(1.234);
    expect(fromMajor(10.99, "usd")).toEqual({ amountMinor: 1099, currency: "USD" });
    expect(fromMajor(0.1 + 0.2, "USD")).toEqual({ amountMinor: 30, currency: "USD" });
  });

  it("parses integer strings and rejects anything else", () => {
    expect(parseIntegerString("1099")).toBe(1099);
    expect(parseIntegerString("-250")).toBe(-250);
    expect(() => parseIntegerString("10.99")).toThrow();
    expect(() => parseIntegerString("")).toThrow();
    expect(() => parseIntegerString("NaN")).toThrow();
  });
});

describe("sumByCurrency", () => {
  it("sums per currency in a stable order", () => {
    expect(
      sumByCurrency([
        { amountMinor: 100, currency: "USD" },
        { amountMinor: 50, currency: "EUR" },
        { amountMinor: 25, currency: "USD" },
      ]),
    ).toEqual([
      { amountMinor: 50, currency: "EUR" },
      { amountMinor: 125, currency: "USD" },
    ]);
    expect(sumByCurrency([])).toEqual([]);
  });
});

describe("formatMoney", () => {
  it("formats transactions with up to the currency's decimals", () => {
    expect(formatMoney({ amountMinor: 1099, currency: "USD" })).toBe("$10.99");
    expect(formatMoney({ amountMinor: 1200, currency: "USD" })).toBe("$12");
    expect(formatMoney({ amountMinor: 500, currency: "JPY" })).toBe("¥500");
    expect(formatMoney({ amountMinor: 1234567, currency: "EUR" })).toBe("€12,345.67");
  });

  it("formats KPIs in whole units", () => {
    expect(formatMoney({ amountMinor: 1234599, currency: "USD" }, "kpi")).toBe("$12,346");
  });

  it("formats lists and empty values", () => {
    expect(formatMoneyList([])).toBe("—");
    expect(formatMoneyList([{ amountMinor: 0, currency: "USD" }])).toBe("$0");
    expect(
      formatMoneyList([
        { amountMinor: 1000, currency: "USD" },
        { amountMinor: 500, currency: "EUR" },
      ]),
    ).toBe("$10 + €5");
  });
});
