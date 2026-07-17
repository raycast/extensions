/**
 * Formatting utility unit tests.
 *
 * Tests all pure formatting functions in `utils/formatting.ts` to ensure
 * consistent display of currencies, numbers, percentages, dates, and
 * Yahoo Finance minor currency normalisation.
 *
 * These are pure unit tests — no network access, no Raycast runtime required.
 * They run entirely in-memory and should execute in milliseconds.
 *
 * Run with: npm test -- --testPathPattern=formatting
 */

import {
  getCurrencySymbol,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatUnits,
  formatPercent,
  formatDate,
  formatRelativeTime,
  getTodayDateKey,
  normaliseCurrencyPrice,
  getDisplayName,
  hasCustomName,
} from "../utils/formatting";

// ──────────────────────────────────────────
// getCurrencySymbol
// ──────────────────────────────────────────

describe("getCurrencySymbol", () => {
  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns Fr for CHF", () => {
    expect(getCurrencySymbol("CHF")).toBe("Fr");
  });

  it("returns ¥ for JPY", () => {
    expect(getCurrencySymbol("JPY")).toBe("¥");
  });

  it("returns C$ for CAD", () => {
    expect(getCurrencySymbol("CAD")).toBe("C$");
  });

  it("returns A$ for AUD", () => {
    expect(getCurrencySymbol("AUD")).toBe("A$");
  });

  it("returns p for GBp (pence)", () => {
    expect(getCurrencySymbol("GBp")).toBe("p");
  });

  it("falls back to the code itself for unknown currencies", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });

  it("falls back to the code for an empty string", () => {
    expect(getCurrencySymbol("")).toBe("");
  });
});

// ──────────────────────────────────────────
// formatCurrency
// ──────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats a positive GBP amount", () => {
    expect(formatCurrency(1234.5, "GBP")).toBe("£1,234.50");
  });

  it("formats a positive USD amount", () => {
    expect(formatCurrency(42.1, "USD")).toBe("$42.10");
  });

  it("formats a negative amount with a minus sign before the symbol", () => {
    expect(formatCurrency(-42.1, "USD")).toBe("-$42.10");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0, "EUR")).toBe("€0.00");
  });

  it("formats large numbers with comma separators", () => {
    expect(formatCurrency(1234567.89, "GBP")).toBe("£1,234,567.89");
  });

  it("formats small decimal amounts", () => {
    expect(formatCurrency(0.5, "USD")).toBe("$0.50");
  });

  it("respects custom decimal places", () => {
    expect(formatCurrency(1234.5678, "GBP", { decimals: 4 })).toBe("£1,234.5678");
  });

  it("respects zero decimal places", () => {
    expect(formatCurrency(1234.5678, "GBP", { decimals: 0 })).toBe("£1,235");
  });

  it("shows + sign for positive amounts when showSign is true", () => {
    expect(formatCurrency(42.1, "USD", { showSign: true })).toBe("+$42.10");
  });

  it("shows - sign for negative amounts when showSign is true", () => {
    expect(formatCurrency(-42.1, "USD", { showSign: true })).toBe("-$42.10");
  });

  it("does not show + sign for zero when showSign is true", () => {
    expect(formatCurrency(0, "GBP", { showSign: true })).toBe("£0.00");
  });

  it("does not show + sign by default", () => {
    expect(formatCurrency(100, "GBP")).toBe("£100.00");
  });

  it("handles unknown currency codes gracefully", () => {
    expect(formatCurrency(100, "XYZ")).toBe("XYZ100.00");
  });

  it("combines showSign and custom decimals", () => {
    expect(formatCurrency(1234.5, "EUR", { showSign: true, decimals: 0 })).toBe("+€1,235");
  });
});

// ──────────────────────────────────────────
// formatCurrencyCompact
// ──────────────────────────────────────────

describe("formatCurrencyCompact", () => {
  it("formats amounts under 1,000 with full precision", () => {
    expect(formatCurrencyCompact(850, "GBP")).toBe("£850.00");
  });

  it("formats amounts between 1,000 and 9,999 with no decimals", () => {
    expect(formatCurrencyCompact(1234, "GBP")).toBe("£1,234");
  });

  it("formats amounts between 1,000 and 9,999 with commas", () => {
    expect(formatCurrencyCompact(5678, "USD")).toBe("$5,678");
  });

  it("formats amounts >= 10,000 with K suffix", () => {
    expect(formatCurrencyCompact(10000, "GBP")).toBe("£10.0K");
  });

  it("formats amounts in tens of thousands with K suffix", () => {
    expect(formatCurrencyCompact(85000, "GBP")).toBe("£85.0K");
  });

  it("formats amounts >= 1,000,000 with M suffix", () => {
    expect(formatCurrencyCompact(1500000, "USD")).toBe("$1.5M");
  });

  it("formats amounts >= 1,000,000,000 with B suffix", () => {
    expect(formatCurrencyCompact(2300000000, "EUR")).toBe("€2.3B");
  });

  it("handles negative amounts under 1,000", () => {
    expect(formatCurrencyCompact(-500, "GBP")).toBe("-£500.00");
  });

  it("handles negative amounts with K suffix", () => {
    expect(formatCurrencyCompact(-50000, "USD")).toBe("-$50.0K");
  });

  it("handles negative amounts with M suffix", () => {
    expect(formatCurrencyCompact(-2500000, "GBP")).toBe("-£2.5M");
  });

  it("handles zero", () => {
    expect(formatCurrencyCompact(0, "GBP")).toBe("£0.00");
  });

  it("handles very small amounts", () => {
    expect(formatCurrencyCompact(0.5, "USD")).toBe("$0.50");
  });
});

// ──────────────────────────────────────────
// formatNumber
// ──────────────────────────────────────────

describe("formatNumber", () => {
  it("formats with default 2 decimal places", () => {
    expect(formatNumber(1234.5)).toBe("1,234.50");
  });

  it("formats zero decimal places", () => {
    expect(formatNumber(1234.5, 0)).toBe("1,235");
  });

  it("formats 4 decimal places", () => {
    expect(formatNumber(0.1234, 4)).toBe("0.1234");
  });

  it("adds thousand separators", () => {
    expect(formatNumber(1234567.89)).toBe("1,234,567.89");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0.00");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1234.5)).toBe("-1,234.50");
  });

  it("pads with trailing zeros to reach specified decimals", () => {
    expect(formatNumber(100, 3)).toBe("100.000");
  });

  it("formats small decimals correctly", () => {
    expect(formatNumber(0.001, 3)).toBe("0.001");
  });

  it("rounds appropriately when reducing decimal places", () => {
    expect(formatNumber(1.999, 2)).toBe("2.00");
  });
});

// ──────────────────────────────────────────
// formatUnits
// ──────────────────────────────────────────

describe("formatUnits", () => {
  it("formats whole numbers without trailing zeros", () => {
    expect(formatUnits(100)).toBe("100");
  });

  it("formats fractional units trimming trailing zeros", () => {
    expect(formatUnits(12.5)).toBe("12.5");
  });

  it("trims trailing zeros after decimal point", () => {
    expect(formatUnits(3.1)).toBe("3.1");
  });

  it("preserves significant fractional digits", () => {
    expect(formatUnits(0.0025)).toBe("0.0025");
  });

  it("handles zero", () => {
    expect(formatUnits(0)).toBe("0");
  });

  it("handles very small fractions", () => {
    expect(formatUnits(0.0001)).toBe("0.0001");
  });

  it("handles units with many decimal places (truncated to UNITS_DECIMALS=4)", () => {
    // formatUnits uses UNITS_DECIMALS (4) to fix, then trims
    expect(formatUnits(1.23456789)).toBe("1.2346"); // rounded to 4 places
  });

  it("formats 1 as a clean integer", () => {
    expect(formatUnits(1)).toBe("1");
  });

  it("formats 10.0 as a clean integer", () => {
    expect(formatUnits(10.0)).toBe("10");
  });

  it("preserves two decimal places when meaningful", () => {
    expect(formatUnits(50.25)).toBe("50.25");
  });
});

// ──────────────────────────────────────────
// formatPercent
// ──────────────────────────────────────────

describe("formatPercent", () => {
  it("formats a positive percentage with + sign by default", () => {
    expect(formatPercent(1.25)).toBe("+1.25%");
  });

  it("formats a negative percentage with - sign", () => {
    expect(formatPercent(-0.5)).toBe("-0.50%");
  });

  it("formats zero without a sign", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("respects custom decimal places", () => {
    expect(formatPercent(1.2345, { decimals: 1 })).toBe("+1.2%");
  });

  it("respects showSign: false for positive values", () => {
    expect(formatPercent(5.0, { showSign: false })).toBe("5.00%");
  });

  it("still shows - sign when showSign is false", () => {
    // Negative sign is always shown (it's part of the number, not the "show sign" option)
    expect(formatPercent(-3.5, { showSign: false })).toBe("-3.50%");
  });

  it("formats large percentages", () => {
    expect(formatPercent(150.75)).toBe("+150.75%");
  });

  it("formats very small percentages", () => {
    expect(formatPercent(0.01)).toBe("+0.01%");
  });

  it("combines custom decimals and showSign: false", () => {
    expect(formatPercent(42.567, { decimals: 1, showSign: false })).toBe("42.6%");
  });
});

// ──────────────────────────────────────────
// formatDate
// ──────────────────────────────────────────

describe("formatDate", () => {
  it("formats an ISO date string as a short date", () => {
    const result = formatDate("2025-07-15T12:00:00.000Z");
    // The exact format depends on locale, but should contain "15", "Jul", "2025"
    expect(result).toContain("15");
    expect(result).toContain("Jul");
    expect(result).toContain("2025");
  });

  it("formats January dates correctly", () => {
    const result = formatDate("2024-01-01T00:00:00.000Z");
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });

  it("formats December dates correctly", () => {
    const result = formatDate("2024-12-25T00:00:00.000Z");
    expect(result).toContain("Dec");
    expect(result).toContain("2024");
  });

  it("handles dates near midnight UTC", () => {
    const result = formatDate("2024-06-15T23:59:59.999Z");
    // Should still parse and format without error
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────
// formatRelativeTime
// ──────────────────────────────────────────

describe("formatRelativeTime", () => {
  it("returns 'just now' for a timestamp within the last minute", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns 'just now' for a timestamp 30 seconds ago", () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe("just now");
  });

  it("returns minutes for timestamps 1-59 minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours for timestamps 1-23 hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days for timestamps 1-29 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });

  it("returns a formatted date for timestamps 30+ days ago", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(sixtyDaysAgo);
    // Should be a date string, not a relative time
    expect(result).not.toContain("ago");
    expect(result).not.toBe("just now");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns 'just now' for future timestamps", () => {
    const future = new Date(Date.now() + 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe("just now");
  });

  it("handles edge case at exactly 60 seconds", () => {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const result = formatRelativeTime(sixtySecondsAgo);
    expect(result).toBe("1m ago");
  });

  it("handles edge case at exactly 60 minutes", () => {
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(sixtyMinutesAgo);
    expect(result).toBe("1h ago");
  });

  it("handles edge case at exactly 24 hours", () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twentyFourHoursAgo);
    expect(result).toBe("1d ago");
  });
});

// ──────────────────────────────────────────
// getTodayDateKey
// ──────────────────────────────────────────

describe("getTodayDateKey", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const key = getTodayDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const key = getTodayDateKey();
    const today = new Date().toISOString().split("T")[0];
    expect(key).toBe(today);
  });

  it("has exactly 10 characters", () => {
    expect(getTodayDateKey().length).toBe(10);
  });

  it("starts with the current year", () => {
    const currentYear = new Date().getFullYear().toString();
    expect(getTodayDateKey().startsWith(currentYear)).toBe(true);
  });
});

// ──────────────────────────────────────────
// normaliseCurrencyPrice
// ──────────────────────────────────────────

describe("normaliseCurrencyPrice", () => {
  describe("GBp → GBP conversion (pence to pounds)", () => {
    it("converts pence to pounds", () => {
      const result = normaliseCurrencyPrice(7245, "GBp");
      expect(result.price).toBeCloseTo(72.45, 2);
      expect(result.currency).toBe("GBP");
    });

    it("handles small pence values", () => {
      const result = normaliseCurrencyPrice(50, "GBp");
      expect(result.price).toBeCloseTo(0.5, 2);
      expect(result.currency).toBe("GBP");
    });

    it("handles zero", () => {
      const result = normaliseCurrencyPrice(0, "GBp");
      expect(result.price).toBe(0);
      expect(result.currency).toBe("GBP");
    });

    it("handles negative values (for price changes)", () => {
      const result = normaliseCurrencyPrice(-150, "GBp");
      expect(result.price).toBeCloseTo(-1.5, 2);
      expect(result.currency).toBe("GBP");
    });

    it("handles decimal pence values", () => {
      const result = normaliseCurrencyPrice(7245.5, "GBp");
      expect(result.price).toBeCloseTo(72.455, 3);
      expect(result.currency).toBe("GBP");
    });
  });

  describe("ILA → ILS conversion (Agorot to Shekel)", () => {
    it("converts Agorot to Shekel", () => {
      const result = normaliseCurrencyPrice(5000, "ILA");
      expect(result.price).toBeCloseTo(50, 2);
      expect(result.currency).toBe("ILS");
    });
  });

  describe("ZAc → ZAR conversion (cents to Rand)", () => {
    it("converts South African cents to Rand", () => {
      const result = normaliseCurrencyPrice(10000, "ZAc");
      expect(result.price).toBeCloseTo(100, 2);
      expect(result.currency).toBe("ZAR");
    });
  });

  describe("pass-through for major currencies", () => {
    it("passes through USD unchanged", () => {
      const result = normaliseCurrencyPrice(234.5, "USD");
      expect(result.price).toBe(234.5);
      expect(result.currency).toBe("USD");
    });

    it("passes through GBP unchanged (not GBp)", () => {
      const result = normaliseCurrencyPrice(72.45, "GBP");
      expect(result.price).toBe(72.45);
      expect(result.currency).toBe("GBP");
    });

    it("passes through EUR unchanged", () => {
      const result = normaliseCurrencyPrice(100.0, "EUR");
      expect(result.price).toBe(100.0);
      expect(result.currency).toBe("EUR");
    });

    it("passes through JPY unchanged", () => {
      const result = normaliseCurrencyPrice(15000, "JPY");
      expect(result.price).toBe(15000);
      expect(result.currency).toBe("JPY");
    });

    it("passes through CHF unchanged", () => {
      const result = normaliseCurrencyPrice(85.3, "CHF");
      expect(result.price).toBe(85.3);
      expect(result.currency).toBe("CHF");
    });

    it("passes through unknown currencies unchanged", () => {
      const result = normaliseCurrencyPrice(999, "XYZ");
      expect(result.price).toBe(999);
      expect(result.currency).toBe("XYZ");
    });
  });
});

// ──────────────────────────────────────────
// Edge Cases & Robustness
// ──────────────────────────────────────────

describe("Edge cases", () => {
  it("formatCurrency handles very large numbers", () => {
    const result = formatCurrency(999999999999.99, "USD");
    expect(result).toContain("$");
    expect(result).toContain("999");
  });

  it("formatCurrency handles very small positive numbers", () => {
    const result = formatCurrency(0.01, "GBP");
    expect(result).toBe("£0.01");
  });

  it("formatCurrency handles very small negative numbers", () => {
    const result = formatCurrency(-0.01, "GBP");
    expect(result).toBe("-£0.01");
  });

  it("formatNumber handles NaN gracefully", () => {
    const result = formatNumber(NaN);
    expect(result).toBe("NaN");
  });

  it("formatNumber handles Infinity", () => {
    const result = formatNumber(Infinity);
    expect(result).toBe("∞");
  });

  it("formatPercent handles very large percentages", () => {
    const result = formatPercent(9999.99);
    expect(result).toBe("+9999.99%");
  });

  it("formatPercent handles NaN", () => {
    const result = formatPercent(NaN);
    expect(result).toBe("NaN%");
  });

  it("formatUnits handles very large unit counts", () => {
    const result = formatUnits(1000000);
    expect(result).toBe("1000000");
  });

  it("normaliseCurrencyPrice handles very large pence values", () => {
    const result = normaliseCurrencyPrice(1000000, "GBp");
    expect(result.price).toBeCloseTo(10000, 0);
    expect(result.currency).toBe("GBP");
  });

  it("formatCurrencyCompact handles exactly 10,000", () => {
    const result = formatCurrencyCompact(10000, "GBP");
    expect(result).toBe("£10.0K");
  });

  it("formatCurrencyCompact handles exactly 1,000,000", () => {
    const result = formatCurrencyCompact(1000000, "GBP");
    expect(result).toBe("£1.0M");
  });

  it("formatCurrencyCompact handles exactly 1,000,000,000", () => {
    const result = formatCurrencyCompact(1000000000, "GBP");
    expect(result).toBe("£1.0B");
  });
});

// ──────────────────────────────────────────
// getDisplayName
// ──────────────────────────────────────────

describe("getDisplayName", () => {
  it("returns the original name when no custom name is set", () => {
    expect(getDisplayName({ name: "Apple Inc.", customName: undefined })).toBe("Apple Inc.");
  });

  it("returns the original name when customName is not present", () => {
    expect(getDisplayName({ name: "Vanguard S&P 500 UCITS ETF" })).toBe("Vanguard S&P 500 UCITS ETF");
  });

  it("returns the custom name when set", () => {
    expect(getDisplayName({ name: "VANGUARD S&P 500 UCITS ETF GBP ACC", customName: "Vanguard S&P 500" })).toBe(
      "Vanguard S&P 500",
    );
  });

  it("falls back to original name when custom name is an empty string", () => {
    expect(getDisplayName({ name: "Apple Inc.", customName: "" })).toBe("Apple Inc.");
  });

  it("falls back to original name when custom name is whitespace only", () => {
    expect(getDisplayName({ name: "Apple Inc.", customName: "   " })).toBe("Apple Inc.");
  });

  it("trims whitespace from custom name", () => {
    expect(getDisplayName({ name: "Apple Inc.", customName: "  My Apple  " })).toBe("My Apple");
  });
});

// ──────────────────────────────────────────
// hasCustomName
// ──────────────────────────────────────────

describe("hasCustomName", () => {
  it("returns false when customName is undefined", () => {
    expect(hasCustomName({ customName: undefined })).toBe(false);
  });

  it("returns false when customName is not present", () => {
    expect(hasCustomName({})).toBe(false);
  });

  it("returns false when customName is an empty string", () => {
    expect(hasCustomName({ customName: "" })).toBe(false);
  });

  it("returns false when customName is whitespace only", () => {
    expect(hasCustomName({ customName: "   " })).toBe(false);
  });

  it("returns true when customName is set", () => {
    expect(hasCustomName({ customName: "My Custom Name" })).toBe(true);
  });

  it("returns true when customName has leading/trailing spaces but non-empty content", () => {
    expect(hasCustomName({ customName: "  Renamed  " })).toBe(true);
  });
});
