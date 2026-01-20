import { describe, test, expect } from "vitest";
import { formatMoney, toMarkdown, toClipboardText, toCSV } from "./format";
import type { Params, Result } from "./types";

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

const baseResult: Result = {
  fvBeforeTax: 162889,
  fvAfterTax: undefined,
  contrib: 100000,
  gain: 62889,
  tax: undefined,
  months: 120,
  monthlyRate: 0.004074,
};

describe("formatMoney", () => {
  describe("currency formatting", () => {
    test("USD format (English)", () => {
      const result = formatMoney(1234567, "USD", "floor", "en");
      expect(result).toBe("$1,234,567");
    });

    test("USD format (Japanese)", () => {
      const result = formatMoney(1234567, "USD", "floor", "ja");
      expect(result).toBe("$1,234,567");
    });

    test("JPY format (English)", () => {
      const result = formatMoney(1234567, "JPY", "floor", "en");
      expect(result).toBe("¥1,234,567");
    });

    test("JPY format (Japanese)", () => {
      const result = formatMoney(1234567, "JPY", "floor", "ja");
      expect(result).toBe("￥1,234,567");
    });

    test("EUR format", () => {
      const result = formatMoney(1234567, "EUR", "floor", "en");
      expect(result).toContain("1,234,567");
    });
  });

  describe("rounding methods", () => {
    test("floor: 1234.9 -> 1234", () => {
      const result = formatMoney(1234.9, "USD", "floor", "en");
      expect(result).toBe("$1,234");
    });

    test("round: 1234.5 -> 1235", () => {
      const result = formatMoney(1234.5, "USD", "round", "en");
      expect(result).toBe("$1,235");
    });

    test("round: 1234.4 -> 1234", () => {
      const result = formatMoney(1234.4, "USD", "round", "en");
      expect(result).toBe("$1,234");
    });

    test("ceil: 1234.1 -> 1235", () => {
      const result = formatMoney(1234.1, "USD", "ceil", "en");
      expect(result).toBe("$1,235");
    });
  });
});

describe("toMarkdown", () => {
  test("basic output contains title and final amount", () => {
    const md = toMarkdown(baseResult, baseParams, "en");
    expect(md).toContain("# Calculation Result");
    expect(md).toContain("## Final Amount");
    expect(md).toContain("Before Tax");
  });

  test("includes breakdown section", () => {
    const md = toMarkdown(baseResult, baseParams, "en");
    expect(md).toContain("## Breakdown");
    expect(md).toContain("Total Principal");
    expect(md).toContain("Gain");
  });

  test("includes conditions section", () => {
    const md = toMarkdown(baseResult, baseParams, "en");
    expect(md).toContain("## Calculation Conditions");
    expect(md).toContain("Principal");
    expect(md).toContain("Annual Rate");
    expect(md).toContain("Period");
  });

  test("Japanese output", () => {
    const md = toMarkdown(baseResult, baseParams, "ja");
    expect(md).toContain("# 計算結果");
    expect(md).toContain("## 最終金額");
    expect(md).toContain("税引前");
  });

  test("with after-tax calculation", () => {
    const params = { ...baseParams, afterTax: true, taxRatePct: 20 };
    const result = { ...baseResult, fvAfterTax: 150000, tax: 12889 };
    const md = toMarkdown(result, params, "en");
    expect(md).toContain("After Tax");
    expect(md).toContain("Tax Amount");
    expect(md).toContain("Tax Rate");
  });

  test("with monthly contributions", () => {
    const params = { ...baseParams, monthly: 30000 };
    const result = { ...baseResult, contrib: 3700000 };
    const md = toMarkdown(result, params, "en");
    expect(md).toContain("Monthly Contribution");
  });
});

describe("toClipboardText", () => {
  test("basic output (English)", () => {
    const text = toClipboardText(baseResult, baseParams, "en");
    expect(text).toContain("Final Amount:");
    expect(text).toContain("Total Principal:");
    expect(text).toContain("Gain:");
  });

  test("basic output (Japanese)", () => {
    const text = toClipboardText(baseResult, baseParams, "ja");
    expect(text).toContain("最終金額:");
    expect(text).toContain("元本合計:");
    expect(text).toContain("利益:");
  });

  test("with after-tax", () => {
    const params = { ...baseParams, afterTax: true, taxRatePct: 20 };
    const result = { ...baseResult, fvAfterTax: 150000, tax: 12889 };
    const text = toClipboardText(result, params, "en");
    expect(text).toContain("After Tax:");
    expect(text).toContain("Tax Amount:");
  });
});

describe("toCSV", () => {
  test("basic output without tax", () => {
    const csv = toCSV(baseResult, baseParams);
    const values = csv.split(",");
    expect(values[0]).toBe("100000"); // principal
    expect(values[1]).toBe("0"); // monthly
    expect(values[2]).toBe("5"); // ratePct
    expect(values[3]).toBe("10"); // years
    expect(values[4]).toBe("100000"); // contrib
    expect(values[5]).toBe("62889"); // gain
    expect(values[6]).toBe("162889"); // fvBeforeTax
    expect(values[7]).toBe(""); // tax (empty)
    expect(values[8]).toBe(""); // fvAfterTax (empty)
  });

  test("with after-tax values", () => {
    const params = { ...baseParams, afterTax: true, taxRatePct: 20 };
    const result = { ...baseResult, fvAfterTax: 150000, tax: 12889 };
    const csv = toCSV(result, params);
    const values = csv.split(",");
    expect(values[7]).toBe("12889"); // tax
    expect(values[8]).toBe("150000"); // fvAfterTax
  });
});
