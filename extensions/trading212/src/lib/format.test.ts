import { afterEach, describe, expect, it } from "vitest";
import {
  appleLocaleToBcp47,
  directionOf,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPct,
  formatPrice,
  formatRelativeMinutes,
  setNumberLocale,
} from "./format";

describe("formatMoney", () => {
  it("formats currency", () => {
    expect(formatMoney(48213.4, "EUR")).toBe("€48,213.40");
  });
  it("prefixes + when signed and positive", () => {
    expect(formatMoney(6912.18, "EUR", { signed: true })).toBe("+€6,912.18");
  });
  it("uses U+2212 minus when negative", () => {
    expect(formatMoney(-212.4, "EUR", { signed: true })).toBe("−€212.40");
    expect(formatMoney(-212.4, "EUR")).toBe("−€212.40");
  });
  it("shows no minus when a negative value rounds to zero", () => {
    expect(formatMoney(-0.004, "EUR")).toBe("€0.00");
    expect(formatMoney(-0.004, "EUR", { signed: true })).toBe("€0.00");
  });
  it("supports zero decimals", () => {
    expect(formatMoney(48213.4, "EUR", { decimals: 0 })).toBe("€48,213");
  });
});

describe("formatPct", () => {
  it("formats signed positive with 1 decimal", () => {
    expect(formatPct(16.71, { signed: true })).toBe("+16.7%");
  });
  it("formats signed negative with U+2212", () => {
    expect(formatPct(-3.5, { signed: true })).toBe("−3.5%");
  });
  it("shows zero without sign", () => {
    expect(formatPct(0, { signed: true })).toBe("0.0%");
  });
  it("shows no minus when a negative value rounds to zero", () => {
    expect(formatPct(-0.04, { signed: true })).toBe("0.0%");
    expect(formatPct(-0.04)).toBe("0.0%");
  });
  it("respects decimals", () => {
    expect(formatPct(12.345, { decimals: 2 })).toBe("12.35%");
  });
});

describe("formatPrice", () => {
  it("formats regular currencies", () => {
    expect(formatPrice(228.4, "USD")).toBe("$228.40");
  });
  it("converts pence to pounds", () => {
    expect(formatPrice(9512, "GBX")).toBe("£95.12");
    expect(formatPrice(9512, "GBp")).toBe("£95.12");
  });
});

describe("formatRelativeMinutes", () => {
  it("formats just now, minutes and hours", () => {
    expect(formatRelativeMinutes(0, 20_000)).toBe("just now");
    expect(formatRelativeMinutes(0, 3 * 60_000)).toBe("3 min ago");
    expect(formatRelativeMinutes(0, 125 * 60_000)).toBe("2 h ago");
  });
});

describe("missing or unknown currency", () => {
  it("formats a plain number instead of throwing when the currency is missing", () => {
    expect(formatMoney(5, undefined as unknown as string)).toBe("5.00");
    expect(formatMoney(-5, "", { signed: true })).toBe("−5.00");
    expect(formatPrice(0.2715, undefined as unknown as string)).toBe("0.27");
  });
  it("appends an unrecognised currency code instead of throwing", () => {
    expect(formatMoney(5, "NOTACODE")).toBe("5.00 NOTACODE");
  });
});

describe("number locale (Mac region)", () => {
  afterEach(() => setNumberLocale("en-US"));
  it("formats money, percentages and plain numbers for the region", () => {
    setNumberLocale("cs-CZ");
    expect(formatMoney(690248.25, "CZK")).toBe("690 248,25 Kč");
    expect(formatMoney(-4428.98, "CZK", { signed: true, decimals: 0 })).toBe("−4 429 Kč");
    expect(formatMoney(70740, "CZK", { signed: true, decimals: 0 })).toBe("+70 740 Kč");
    expect(formatPct(11.34, { signed: true })).toBe("+11,3 %");
    expect(formatPct(-0.6, { signed: true })).toBe("−0,6 %");
    expect(formatPct(-0.04, { signed: true })).toBe("0,0 %");
    expect(formatNumber(7.12345)).toBe("7,1235");
  });
  it("keeps the code for English with a Czech region", () => {
    setNumberLocale("en-CZ");
    expect(formatMoney(690248.25, "CZK")).toBe("690 248,25 CZK");
  });
  it("writes every currency in the region's number format (English with a Czech region)", () => {
    setNumberLocale("en-CZ");
    expect(formatMoney(69.82, "EUR")).toBe("69,82\u00a0€");
    expect(formatMoney(-1234.5, "EUR", { signed: true })).toBe("−1\u00a0234,50\u00a0€");
    expect(formatMoney(160.94, "USD")).toBe("160,94\u00a0US$");
    expect(formatMoneyCompact(23700, "EUR")).toBe("23,7k\u00a0€");
    expect(formatMoneyCompact(23700, "USD")).toBe("23,7k\u00a0US$");
    expect(formatMoneyCompact(23700, "CZK")).toBe("23,7k\u00a0CZK");
    expect(formatMoneyCompact(-23700, "CZK")).toBe("−23,7k\u00a0CZK");
    // Whole amounts have no separators to give the layout away.
    expect(formatMoney(224, "EUR", { decimals: 0 })).toBe("224\u00a0€");
    expect(formatMoney(23, "EUR", { decimals: 0 })).toBe("23\u00a0€");
  });
  it("keeps standard US formatting for en-US", () => {
    expect(formatMoney(69.82, "EUR")).toBe("€69.82");
    expect(formatMoneyCompact(23700, "CZK")).toBe("CZK\u00a023.7k");
    expect(formatMoneyCompact(48213, "EUR")).toBe("€48.2k");
  });
  it("ignores locales Intl doesn't support", () => {
    setNumberLocale("xx-NOPE-zz-1234567890");
    expect(formatMoney(5, "EUR")).toBe("€5.00");
  });
});

describe("appleLocaleToBcp47", () => {
  it("turns macOS AppleLocale values into BCP 47 tags", () => {
    expect(appleLocaleToBcp47("en_CZ")).toBe("en-CZ");
    expect(appleLocaleToBcp47("cs_CZ@currency=CZK")).toBe("cs-CZ");
    expect(appleLocaleToBcp47("zh-Hans_CN")).toBe("zh-Hans-CN");
    expect(appleLocaleToBcp47("")).toBeNull();
  });
});

describe("directionOf", () => {
  it("is up/down by sign, undefined when it rounds to zero", () => {
    expect(directionOf(1.2)).toBe("up");
    expect(directionOf(-0.7)).toBe("down");
    expect(directionOf(-0.04)).toBeUndefined();
  });
});
