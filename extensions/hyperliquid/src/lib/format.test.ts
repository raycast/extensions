import { describe, expect, it } from "vitest";

import {
  formatCompactUsd,
  formatFundingRate,
  formatPercentChange,
  formatPrice,
  formatUsd,
  getSignedColor,
} from "./format";

describe("formatting helpers", () => {
  it("formats prices with useful precision for small and large markets", () => {
    expect(formatPrice(67123.456)).toBe("$67,123.46");
    expect(formatPrice(0.123456)).toBe("$0.1235");
    expect(formatPrice(0.00001234)).toBe("$0.00001234");
  });

  it("formats percentages and funding rates as signed percentages", () => {
    expect(formatPercentChange(0.03456)).toBe("+3.46%");
    expect(formatPercentChange(-0.5)).toBe("-50.00%");
    expect(formatFundingRate("0.000125")).toBe("+0.0125%");
  });

  it("formats USD values and compact notional values", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(-42.1)).toBe("-$42.10");
    expect(formatCompactUsd(12_345_678)).toBe("$12.35M");
  });

  it("maps signed values to semantic colors", () => {
    expect(getSignedColor(1)).toBe("green");
    expect(getSignedColor(-1)).toBe("red");
    expect(getSignedColor(0)).toBe("secondary");
  });
});
