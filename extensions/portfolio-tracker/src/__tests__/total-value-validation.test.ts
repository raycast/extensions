/**
 * Unit tests for total-value validation and computation utilities.
 *
 * Covers:
 * - validateTotalValue: input validation for total investment value fields
 * - parseTotalValue: parsing validated strings to numbers
 * - computeUnitsFromTotalValue: deriving unit count from total value and price
 */

import { validateTotalValue, parseTotalValue, computeUnitsFromTotalValue } from "../utils/validation";

// ──────────────────────────────────────────
// validateTotalValue
// ──────────────────────────────────────────

describe("validateTotalValue", () => {
  describe("required mode (default)", () => {
    it("rejects empty string", () => {
      expect(validateTotalValue("")).toBe("Total value is required");
    });

    it("rejects undefined", () => {
      expect(validateTotalValue(undefined)).toBe("Total value is required");
    });

    it("rejects whitespace-only string", () => {
      expect(validateTotalValue("   ")).toBe("Total value is required");
    });
  });

  describe("allowEmpty mode", () => {
    it("accepts empty string when allowEmpty is true", () => {
      expect(validateTotalValue("", { allowEmpty: true })).toBeUndefined();
    });

    it("accepts undefined when allowEmpty is true", () => {
      expect(validateTotalValue(undefined, { allowEmpty: true })).toBeUndefined();
    });

    it("accepts whitespace-only when allowEmpty is true", () => {
      expect(validateTotalValue("   ", { allowEmpty: true })).toBeUndefined();
    });

    it("still validates non-empty values when allowEmpty is true", () => {
      expect(validateTotalValue("abc", { allowEmpty: true })).toBe("Must be a valid number");
    });
  });

  describe("invalid inputs", () => {
    it("rejects non-numeric strings", () => {
      expect(validateTotalValue("abc")).toBe("Must be a valid number");
    });

    it("rejects mixed alpha-numeric strings", () => {
      expect(validateTotalValue("12abc")).toBe("Must be a valid number");
    });

    it("rejects Infinity", () => {
      expect(validateTotalValue("Infinity")).toBe("Must be a valid number");
    });

    it("rejects NaN literal", () => {
      expect(validateTotalValue("NaN")).toBe("Must be a valid number");
    });

    it("rejects zero", () => {
      expect(validateTotalValue("0")).toBe("Total value must be greater than zero");
    });

    it("rejects negative values", () => {
      expect(validateTotalValue("-500")).toBe("Total value must be greater than zero");
    });

    it("rejects values exceeding 10 billion", () => {
      expect(validateTotalValue("10000000001")).toBe("Total value seems too large — please check your input");
    });

    it("rejects more than 2 decimal places", () => {
      expect(validateTotalValue("1500.123")).toBe("Maximum 2 decimal places allowed for currency values");
    });

    it("rejects 3 decimal places", () => {
      expect(validateTotalValue("99.999")).toBe("Maximum 2 decimal places allowed for currency values");
    });
  });

  describe("valid inputs", () => {
    it("accepts a whole number", () => {
      expect(validateTotalValue("1000")).toBeUndefined();
    });

    it("accepts a value with 1 decimal place", () => {
      expect(validateTotalValue("1500.5")).toBeUndefined();
    });

    it("accepts a value with 2 decimal places", () => {
      expect(validateTotalValue("1500.50")).toBeUndefined();
    });

    it("accepts a small positive value", () => {
      expect(validateTotalValue("0.01")).toBeUndefined();
    });

    it("accepts a large value within bounds", () => {
      expect(validateTotalValue("10000000000")).toBeUndefined();
    });

    it("accepts value with leading/trailing whitespace", () => {
      expect(validateTotalValue("  2500  ")).toBeUndefined();
    });

    it("accepts 1", () => {
      expect(validateTotalValue("1")).toBeUndefined();
    });

    it("accepts a typical investment amount", () => {
      expect(validateTotalValue("25000")).toBeUndefined();
    });
  });
});

// ──────────────────────────────────────────
// parseTotalValue
// ──────────────────────────────────────────

describe("parseTotalValue", () => {
  it("parses a whole number string", () => {
    expect(parseTotalValue("1000")).toBe(1000);
  });

  it("parses a decimal string", () => {
    expect(parseTotalValue("1500.50")).toBe(1500.5);
  });

  it("trims whitespace before parsing", () => {
    expect(parseTotalValue("  2500  ")).toBe(2500);
  });

  it("parses small values", () => {
    expect(parseTotalValue("0.01")).toBe(0.01);
  });

  it("parses large values", () => {
    expect(parseTotalValue("5000000")).toBe(5000000);
  });
});

// ──────────────────────────────────────────
// computeUnitsFromTotalValue
// ──────────────────────────────────────────

describe("computeUnitsFromTotalValue", () => {
  it("computes exact division correctly", () => {
    expect(computeUnitsFromTotalValue(1000, 50)).toBe(20);
  });

  it("computes fractional units for non-exact division", () => {
    const result = computeUnitsFromTotalValue(1000, 72.45);
    expect(result).toBeCloseTo(13.802623, 5);
  });

  it("rounds to 6 decimal places", () => {
    const result = computeUnitsFromTotalValue(100, 3);
    // 100 / 3 = 33.333333... → 33.333333 (6 dp)
    expect(result).toBe(33.333333);
  });

  it("returns 0 when price is zero", () => {
    expect(computeUnitsFromTotalValue(1000, 0)).toBe(0);
  });

  it("returns 0 when price is negative", () => {
    expect(computeUnitsFromTotalValue(1000, -50)).toBe(0);
  });

  it("handles very small total values", () => {
    const result = computeUnitsFromTotalValue(0.01, 100);
    expect(result).toBe(0.0001);
  });

  it("handles very large total values", () => {
    const result = computeUnitsFromTotalValue(1000000, 0.01);
    expect(result).toBe(100000000);
  });

  it("handles equal total and price (1 unit)", () => {
    expect(computeUnitsFromTotalValue(72.45, 72.45)).toBe(1);
  });

  it("handles total less than price (fractional unit)", () => {
    const result = computeUnitsFromTotalValue(25, 100);
    expect(result).toBe(0.25);
  });

  it("handles typical ETF investment", () => {
    // £5,000 invested in an ETF at £72.45/unit
    const result = computeUnitsFromTotalValue(5000, 72.45);
    expect(result).toBeCloseTo(69.013113, 5);
  });

  it("handles typical stock investment with high per-unit price", () => {
    // £10,000 invested in a stock at £3,245.00/share
    const result = computeUnitsFromTotalValue(10000, 3245);
    expect(result).toBeCloseTo(3.081664, 5);
  });

  it("produces consistent results for round-trip (units × price ≈ totalValue)", () => {
    const totalValue = 7500;
    const price = 123.45;
    const units = computeUnitsFromTotalValue(totalValue, price);
    // Round-trip should be very close to the original total
    expect(units * price).toBeCloseTo(totalValue, 2);
  });
});
