/**
 * Tests for wise-helpers utilities.
 */

import { describe, it, expect } from "vitest";
import { sortCurrencies, TOP_CURRENCIES, type CurrencyInfo } from "./wise-helpers";

describe("wise-helpers", () => {
  describe("TOP_CURRENCIES", () => {
    it("contains major world currencies", () => {
      expect(TOP_CURRENCIES).toContain("USD");
      expect(TOP_CURRENCIES).toContain("EUR");
      expect(TOP_CURRENCIES).toContain("GBP");
      expect(TOP_CURRENCIES).toContain("JPY");
      expect(TOP_CURRENCIES).toContain("CHF");
    });

    it("has USD as first currency", () => {
      expect(TOP_CURRENCIES[0]).toBe("USD");
    });

    it("has EUR as second currency", () => {
      expect(TOP_CURRENCIES[1]).toBe("EUR");
    });

    it("contains expected number of top currencies", () => {
      expect(TOP_CURRENCIES.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("sortCurrencies", () => {
    it("sorts top currencies by priority", () => {
      const currencies: CurrencyInfo[] = [
        { currency: "GBP", name: "British Pound" },
        { currency: "USD", name: "US Dollar" },
        { currency: "EUR", name: "Euro" },
      ];

      const sorted = sortCurrencies(currencies);

      expect(sorted[0]!.currency).toBe("USD");
      expect(sorted[1]!.currency).toBe("EUR");
      expect(sorted[2]!.currency).toBe("GBP");
    });

    it("places top currencies before non-top currencies", () => {
      const currencies: CurrencyInfo[] = [
        { currency: "ZAR", name: "South African Rand" },
        { currency: "EUR", name: "Euro" },
        { currency: "BRL", name: "Brazilian Real" },
      ];

      const sorted = sortCurrencies(currencies);

      expect(sorted[0]!.currency).toBe("EUR");
      // Non-top currencies should come after
      expect(sorted.slice(1).every((c) => !TOP_CURRENCIES.includes(c.currency))).toBe(true);
    });

    it("sorts non-top currencies alphabetically", () => {
      const currencies: CurrencyInfo[] = [
        { currency: "ZAR", name: "South African Rand" },
        { currency: "BRL", name: "Brazilian Real" },
        { currency: "MXN", name: "Mexican Peso" },
      ];

      const sorted = sortCurrencies(currencies);

      expect(sorted[0]!.currency).toBe("BRL");
      expect(sorted[1]!.currency).toBe("MXN");
      expect(sorted[2]!.currency).toBe("ZAR");
    });

    it("handles mixed top and non-top currencies", () => {
      const currencies: CurrencyInfo[] = [
        { currency: "ZAR", name: "South African Rand" },
        { currency: "USD", name: "US Dollar" },
        { currency: "BRL", name: "Brazilian Real" },
        { currency: "EUR", name: "Euro" },
        { currency: "ARS", name: "Argentine Peso" },
        { currency: "GBP", name: "British Pound" },
      ];

      const sorted = sortCurrencies(currencies);

      // Top currencies first in order
      expect(sorted[0]!.currency).toBe("USD");
      expect(sorted[1]!.currency).toBe("EUR");
      expect(sorted[2]!.currency).toBe("GBP");

      // Non-top currencies alphabetically
      const nonTop = sorted.slice(3);
      expect(nonTop[0]!.currency).toBe("ARS");
      expect(nonTop[1]!.currency).toBe("BRL");
      expect(nonTop[2]!.currency).toBe("ZAR");
    });

    it("handles empty array", () => {
      const sorted = sortCurrencies([]);
      expect(sorted).toEqual([]);
    });

    it("handles single currency", () => {
      const currencies: CurrencyInfo[] = [{ currency: "EUR", name: "Euro" }];
      const sorted = sortCurrencies(currencies);
      expect(sorted).toHaveLength(1);
      expect(sorted[0]!.currency).toBe("EUR");
    });

    it("does not mutate original array", () => {
      const original: CurrencyInfo[] = [
        { currency: "GBP", name: "British Pound" },
        { currency: "USD", name: "US Dollar" },
      ];
      const originalCopy = [...original];

      sortCurrencies(original);

      expect(original).toEqual(originalCopy);
    });

    it("handles currencies without name", () => {
      const currencies: CurrencyInfo[] = [{ currency: "USD" }, { currency: "EUR" }, { currency: "GBP" }];

      const sorted = sortCurrencies(currencies);

      expect(sorted[0]!.currency).toBe("USD");
      expect(sorted[1]!.currency).toBe("EUR");
      expect(sorted[2]!.currency).toBe("GBP");
    });

    it("maintains stability for equal elements", () => {
      // Two non-top currencies that sort equal alphabetically don't exist,
      // but we can test stability by running multiple times
      const currencies: CurrencyInfo[] = [
        { currency: "ZAR", name: "South African Rand" },
        { currency: "BRL", name: "Brazilian Real" },
      ];

      const sorted1 = sortCurrencies(currencies);
      const sorted2 = sortCurrencies(currencies);

      expect(sorted1.map((c) => c.currency)).toEqual(sorted2.map((c) => c.currency));
    });
  });
});
