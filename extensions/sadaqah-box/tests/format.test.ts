import { describe, expect, test } from "bun:test";
import { formatCurrency, formatDate, formatNumber, formatValue } from "../src/utils/format";

describe("format utilities", () => {
  test("formatCurrency handles standard, small, and symbol===code currencies", () => {
    expect(formatCurrency(25, { symbol: "$", code: "USD" })).toBe("$25 USD");
    expect(formatCurrency(0.00123, { symbol: "XAU", code: "XAU" })).toBe("0.00123 XAU");
    expect(formatCurrency(0, { symbol: "XAU", code: "XAU" })).toBe("0 XAU");
    expect(formatCurrency(null, undefined)).toBe("0");
  });

  test("formatValue strips trailing zeros", () => {
    expect(formatValue(10)).toBe("10");
    expect(formatValue(1.25)).toBe("1.25");
    expect(formatValue(0.0045)).toBe("0.0045");
  });

  test("formatNumber formats up to max fraction digits", () => {
    expect(formatNumber(1.234567)).toContain("1.23457");
  });

  test("formatDate supports short and long month formats", () => {
    const formatted = formatDate("2026-03-15T10:30:00.000Z", { longMonth: true });
    expect(formatted).toContain("March");
    expect(formatted).toContain("2026");
  });
});
