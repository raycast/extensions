import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDuration,
  formatNumber,
} from "./formatUsageValue";

describe("formatCurrency", () => {
  it("formats USD with two decimal places", () => {
    expect(formatCurrency(32.968231)).toBe("$32.97");
  });
});

describe("formatNumber", () => {
  it("formats whole numbers with grouping", () => {
    expect(formatNumber(36393794)).toBe("36,393,794");
  });
});

describe("formatDuration", () => {
  it("formats minutes below one hour", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("formats minutes above one hour", () => {
    expect(formatDuration(113)).toBe("1h 53m");
  });
});
