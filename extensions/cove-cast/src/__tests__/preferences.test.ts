import { describe, expect, it } from "vitest";
import {
  normalizePreferences,
  parseAmounts,
  parseCsvList,
  type RawPreferences,
} from "../preferences";

describe("parseCsvList", () => {
  it("splits, trims, and drops empties", () => {
    expect(parseCsvList(" base, ethereum ,, solana ")).toEqual([
      "base",
      "ethereum",
      "solana",
    ]);
    expect(parseCsvList("")).toEqual([]);
  });
});

describe("parseAmounts", () => {
  it("parses positive numbers and drops invalid entries", () => {
    expect(parseAmounts("25,50,100,500")).toEqual([25, 50, 100, 500]);
    expect(parseAmounts("0.5, 1 ,bad,,2,-3,0")).toEqual([0.5, 1, 2]);
  });
});

describe("normalizePreferences", () => {
  const raw: RawPreferences = {
    amounts: "25,50,100,500",
    defaultBuyAction: "g",
    quickBuyAmount: "100",
  };

  it("normalizes raw preferences into typed config", () => {
    const config = normalizePreferences(raw);
    expect(config.amounts).toEqual([25, 50, 100, 500]);
    expect(config.defaultBuyAction).toBe("g");
  });

  it("parses the quick buy amount as a number", () => {
    expect(normalizePreferences(raw).quickBuyAmount).toBe(100);
    expect(
      normalizePreferences({ ...raw, quickBuyAmount: "0.5" }).quickBuyAmount,
    ).toBe(0.5);
  });
});
