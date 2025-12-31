import { describe, test, expect } from "vitest";
import { parseQuickInput } from "./parse";
import type { Preferences } from "./types";

const defaultPreferences: Preferences = {
  language: "en",
  defaultCurrency: "USD",
  defaultTaxRate: "",
  defaultCompoundFreq: "yearly",
  defaultRounding: "floor",
};

describe("parseQuickInput", () => {
  describe("positional arguments (space-separated)", () => {
    test("2 args: rate, years", () => {
      const result = parseQuickInput("5 10", defaultPreferences, "en");
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.principal).toBe(0);
      expect(result.monthly).toBe(0);
    });

    test("3 args: principal, rate, years", () => {
      const result = parseQuickInput("100000 5 10", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(0);
    });

    test("4 args: principal, rate, years, monthly", () => {
      const result = parseQuickInput("100000 5 10 30000", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
    });

    test("5 args: principal, rate, years, monthly, tax", () => {
      const result = parseQuickInput("100000 5 10 30000 20", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
      expect(result.taxRatePct).toBe(20);
      expect(result.afterTax).toBe(true);
    });
  });

  describe("period with units", () => {
    test("10y format", () => {
      const result = parseQuickInput("100000 5% 10y", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("10years format", () => {
      const result = parseQuickInput("100000 5% 10years", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("10year format (singular)", () => {
      const result = parseQuickInput("100000 5% 10year", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("Japanese format: 10年", () => {
      const result = parseQuickInput("100000 5% 10年", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("120m format (months to years)", () => {
      const result = parseQuickInput("100000 5% 120m", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("120months format", () => {
      const result = parseQuickInput("100000 5% 120months", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("Japanese format: 120ヶ月", () => {
      const result = parseQuickInput("100000 5% 120ヶ月", defaultPreferences, "en");
      expect(result.years).toBe(10);
    });

    test("when period has unit, positional args are interpreted as 4", () => {
      const result = parseQuickInput("100000 5% 10y 30000", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
    });
  });

  describe("money formats", () => {
    test("comma separated: 100,000", () => {
      const result = parseQuickInput("100,000 5% 10y", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
    });

    test("yen suffix: 10000円", () => {
      const result = parseQuickInput("10000円 5% 10年", defaultPreferences, "ja");
      expect(result.principal).toBe(10000);
    });

    test("man unit: 10万", () => {
      const result = parseQuickInput("10万 5% 10年", defaultPreferences, "ja");
      expect(result.principal).toBe(100000);
    });

    test("man-en suffix: 10万円", () => {
      const result = parseQuickInput("10万円 5% 10年", defaultPreferences, "ja");
      expect(result.principal).toBe(100000);
    });

    test("decimal man unit: 1.5万円", () => {
      const result = parseQuickInput("1.5万円 5% 10年", defaultPreferences, "ja");
      expect(result.principal).toBe(15000);
    });

    test("dollar sign: $100", () => {
      const result = parseQuickInput("$10000 5% 10y", defaultPreferences, "en");
      expect(result.principal).toBe(10000);
    });

    test("yen sign: ¥1000", () => {
      const result = parseQuickInput("¥10000 5% 10年", defaultPreferences, "ja");
      expect(result.principal).toBe(10000);
    });

    test("euro sign: €50", () => {
      const result = parseQuickInput("€10000 5% 10y", defaultPreferences, "en");
      expect(result.principal).toBe(10000);
    });

    test("pound sign: £100", () => {
      const result = parseQuickInput("£10000 5% 10y", defaultPreferences, "en");
      expect(result.principal).toBe(10000);
    });

    test("million unit via key-value: p=1.5m", () => {
      const result = parseQuickInput("p=1.5m r=5% y=10", defaultPreferences, "en");
      expect(result.principal).toBe(1500000);
    });
  });

  describe("percentage formats", () => {
    test("with % symbol", () => {
      const result = parseQuickInput("100000 5% 10y", defaultPreferences, "en");
      expect(result.ratePct).toBe(5);
    });

    test("without % symbol", () => {
      const result = parseQuickInput("100000 5 10y", defaultPreferences, "en");
      expect(result.ratePct).toBe(5);
    });
  });

  describe("delimiters (space only)", () => {
    test("space separated", () => {
      const result = parseQuickInput("100000 5% 10y 30000 20%", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
      expect(result.taxRatePct).toBe(20);
    });

    test("amounts with internal commas", () => {
      const result = parseQuickInput("100,000 5% 10y 30,000 20%", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
      expect(result.taxRatePct).toBe(20);
    });
  });

  describe("key-value pattern", () => {
    test("basic format", () => {
      const result = parseQuickInput("p=100000 r=5 y=10", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
    });

    test("full specification", () => {
      const result = parseQuickInput("p=100000 r=5 y=10 m=30000 tax=20", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
      expect(result.taxRatePct).toBe(20);
    });

    test("full name keys", () => {
      const result = parseQuickInput("principal=100000 rate=5 years=10", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
    });

    test("key-value with % symbol", () => {
      const result = parseQuickInput("p=100000 r=5% y=10 tax=20%", defaultPreferences, "en");
      expect(result.ratePct).toBe(5);
      expect(result.taxRatePct).toBe(20);
    });

    test("key-value with Japanese units", () => {
      const result = parseQuickInput("p=10万円 r=5% y=10年 m=3万円", defaultPreferences, "ja");
      expect(result.principal).toBe(100000);
      expect(result.monthly).toBe(30000);
    });
  });

  describe("combined patterns", () => {
    test("Japanese notation combined", () => {
      const result = parseQuickInput("10万円 5% 10年 3万円 20%", defaultPreferences, "ja");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
      expect(result.taxRatePct).toBe(20);
    });

    test("currency symbols with unit period", () => {
      const result = parseQuickInput("$10000 5% 10years $3000 20%", defaultPreferences, "en");
      expect(result.principal).toBe(10000);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(3000);
    });

    test("amounts with internal commas", () => {
      const result = parseQuickInput("¥100,000 5% 10年 ¥30,000", defaultPreferences, "ja");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
      expect(result.monthly).toBe(30000);
    });
  });

  describe("default values", () => {
    test("default currency", () => {
      const result = parseQuickInput("5% 10y", defaultPreferences, "en");
      expect(result.currency).toBe("USD");
    });

    test("default compound frequency", () => {
      const result = parseQuickInput("5% 10y", defaultPreferences, "en");
      expect(result.freq).toBe("yearly");
    });

    test("default rounding", () => {
      const result = parseQuickInput("5% 10y", defaultPreferences, "en");
      expect(result.rounding).toBe("floor");
    });

    test("default tax rate (empty string)", () => {
      const result = parseQuickInput("5% 10y", defaultPreferences, "en");
      expect(result.taxRatePct).toBe(0);
      expect(result.afterTax).toBe(false);
    });

    test("default tax rate (with value)", () => {
      const prefs = { ...defaultPreferences, defaultTaxRate: "15" };
      const result = parseQuickInput("5% 10y", prefs, "en");
      expect(result.taxRatePct).toBe(15);
    });
  });

  describe("error cases", () => {
    test("rate is required", () => {
      expect(() => parseQuickInput("100000", defaultPreferences, "en")).toThrow();
    });

    test("years is required", () => {
      expect(() => parseQuickInput("5%", defaultPreferences, "en")).toThrow();
    });

    test("rate range check (lower bound)", () => {
      expect(() => parseQuickInput("r=-101% y=10", defaultPreferences, "en")).toThrow();
    });

    test("rate range check (upper bound)", () => {
      expect(() => parseQuickInput("r=1001% y=10", defaultPreferences, "en")).toThrow();
    });

    test("years range check (lower bound)", () => {
      expect(() => parseQuickInput("5% 0y", defaultPreferences, "en")).toThrow();
    });

    test("years range check (upper bound)", () => {
      expect(() => parseQuickInput("5% 101y", defaultPreferences, "en")).toThrow();
    });

    test("negative principal (key-value)", () => {
      expect(() => parseQuickInput("p=-100000 r=5% y=10", defaultPreferences, "en")).toThrow();
    });

    test("negative monthly (key-value)", () => {
      expect(() => parseQuickInput("p=100000 r=5 y=10 m=-30000", defaultPreferences, "en")).toThrow();
    });
  });

  describe("error messages by language", () => {
    test("English error message", () => {
      expect(() => parseQuickInput("100000", defaultPreferences, "en")).toThrow("Rate and years are required");
    });

    test("Japanese error message", () => {
      expect(() => parseQuickInput("100000", defaultPreferences, "ja")).toThrow("利率と期間は必須です");
    });
  });

  describe("edge cases", () => {
    test("decimal rate", () => {
      const result = parseQuickInput("5.5% 10y", defaultPreferences, "en");
      expect(result.ratePct).toBe(5.5);
    });

    test("decimal years", () => {
      const result = parseQuickInput("5% 10.5y", defaultPreferences, "en");
      expect(result.years).toBe(10.5);
    });

    test("multiple spaces", () => {
      const result = parseQuickInput("100000    5%     10y", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
      expect(result.ratePct).toBe(5);
      expect(result.years).toBe(10);
    });

    test("leading and trailing whitespace", () => {
      const result = parseQuickInput("  100000 5% 10y  ", defaultPreferences, "en");
      expect(result.principal).toBe(100000);
    });
  });
});
