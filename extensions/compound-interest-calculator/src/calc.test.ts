import { describe, test, expect } from "vitest";
import { calcCompound } from "./calc";
import type { Params } from "./types";

const baseParams: Params = {
  principal: 100000,
  monthly: 0,
  ratePct: 5,
  years: 10,
  freq: "yearly",
  afterTax: false,
  taxRatePct: 0,
  currency: "USD",
  rounding: "floor",
};

describe("calcCompound", () => {
  describe("principal only (no contributions)", () => {
    test("yearly compound: 100000 at 5% for 10 years", () => {
      const result = calcCompound(baseParams);
      // FV = 100000 * (1 + 0.05)^10 = 162889.46
      expect(result.fvBeforeTax).toBeCloseTo(162889.46, 0);
      expect(result.contrib).toBe(100000);
      expect(result.gain).toBeCloseTo(62889.46, 0);
      expect(result.months).toBe(120);
    });

    test("monthly compound: 100000 at 5% for 10 years", () => {
      const params = { ...baseParams, freq: "monthly" as const };
      const result = calcCompound(params);
      // FV = 100000 * (1 + 0.05/12)^(12*10) = 164700.95
      expect(result.fvBeforeTax).toBeCloseTo(164700.95, 0);
    });

    test("daily compound: 100000 at 5% for 10 years", () => {
      const params = { ...baseParams, freq: "daily" as const };
      const result = calcCompound(params);
      // FV = 100000 * (1 + 0.05/365)^(365*10) = 164866.47
      expect(result.fvBeforeTax).toBeCloseTo(164866.47, 0);
    });
  });

  describe("with monthly contributions", () => {
    test("principal + monthly: 100000 + 30000/month at 5% for 10 years", () => {
      const params = { ...baseParams, monthly: 30000 };
      const result = calcCompound(params);
      // Should use monthly compounding automatically
      expect(result.contrib).toBe(100000 + 30000 * 120);
      expect(result.fvBeforeTax).toBeGreaterThan(result.contrib);
      expect(result.months).toBe(120);
    });

    test("monthly only (no principal): 30000/month at 5% for 20 years", () => {
      const params = { ...baseParams, principal: 0, monthly: 30000, years: 20 };
      const result = calcCompound(params);
      expect(result.contrib).toBe(30000 * 240);
      expect(result.fvBeforeTax).toBeGreaterThan(result.contrib);
    });

    test("zero rate: contributions only grow by sum", () => {
      const params = { ...baseParams, principal: 100000, monthly: 30000, ratePct: 0 };
      const result = calcCompound(params);
      // With 0% rate, FV = principal + monthly * months
      expect(result.fvBeforeTax).toBeCloseTo(100000 + 30000 * 120, 0);
      expect(result.gain).toBeCloseTo(0, 0);
    });
  });

  describe("after-tax calculation", () => {
    test("20% tax on gains", () => {
      const params = { ...baseParams, afterTax: true, taxRatePct: 20 };
      const result = calcCompound(params);
      const expectedGain = result.fvBeforeTax - result.contrib;
      const expectedTax = expectedGain * 0.2;
      expect(result.tax).toBeCloseTo(expectedTax, 0);
      expect(result.fvAfterTax).toBeCloseTo(result.fvBeforeTax - expectedTax, 0);
    });

    test("no tax when gains are zero", () => {
      const params = { ...baseParams, ratePct: 0, afterTax: true, taxRatePct: 20 };
      const result = calcCompound(params);
      expect(result.gain).toBeCloseTo(0, 0);
      expect(result.tax).toBeCloseTo(0, 0);
    });

    test("no tax when afterTax is false", () => {
      const params = { ...baseParams, afterTax: false, taxRatePct: 20 };
      const result = calcCompound(params);
      expect(result.fvAfterTax).toBeUndefined();
      expect(result.tax).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    test("fractional years (6.5 years = 78 months)", () => {
      const params = { ...baseParams, years: 6.5 };
      const result = calcCompound(params);
      expect(result.months).toBe(78);
    });

    test("very small rate (0.1%)", () => {
      const params = { ...baseParams, ratePct: 0.1 };
      const result = calcCompound(params);
      expect(result.fvBeforeTax).toBeGreaterThan(100000);
      expect(result.fvBeforeTax).toBeLessThan(102000);
    });

    test("high rate (50%)", () => {
      const params = { ...baseParams, ratePct: 50 };
      const result = calcCompound(params);
      // FV = 100000 * 1.5^10 = 5766504
      expect(result.fvBeforeTax).toBeCloseTo(5766504, -2);
    });

    test("1 year period", () => {
      const params = { ...baseParams, years: 1 };
      const result = calcCompound(params);
      expect(result.fvBeforeTax).toBeCloseTo(105000, 0);
      expect(result.months).toBe(12);
    });
  });

  describe("monthly rate calculation", () => {
    test("monthly rate is geometric mean of annual rate", () => {
      const result = calcCompound(baseParams);
      // i = (1 + 0.05)^(1/12) - 1 = 0.004074
      expect(result.monthlyRate).toBeCloseTo(0.004074, 4);
    });
  });
});
