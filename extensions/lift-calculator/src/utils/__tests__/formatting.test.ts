import { formatWeight, formatPercentage } from "../formatting";
import { UNITS } from "../../constants/shared";

describe("formatWeight", () => {
  test("formats kg values with correct precision", () => {
    expect(formatWeight(100, "kg")).toBe("100.0 kg");
    expect(formatWeight(100.5, "kg")).toBe("100.5 kg");
    expect(formatWeight(100.54321, "kg")).toBe("100.5 kg"); // Tests rounding
  });

  test("converts and formats lbs values correctly", () => {
    // 100kg should be ~220.5lbs
    expect(formatWeight(100, "lbs")).toBe("220.5 lbs");
    // 20kg should be ~44.1lbs
    expect(formatWeight(20, "lbs")).toBe("44.1 lbs");
  });

  test("handles decimal numbers", () => {
    expect(formatWeight(99.9, "kg")).toBe("99.9 kg");
    expect(formatWeight(99.9, "lbs")).toBe("220.2 lbs"); // 99.9kg in lbs
  });

  test("handles very small numbers", () => {
    expect(formatWeight(0.5, "kg")).toBe("0.5 kg");
    expect(formatWeight(0.5, "lbs")).toBe("1.1 lbs");
  });

  test("handles very large numbers", () => {
    expect(formatWeight(1000, "kg")).toBe("1000.0 kg");
    expect(formatWeight(1000, "lbs")).toBe("2204.6 lbs");
  });

  test("maintains consistent decimal places", () => {
    // Check that we always show one decimal place
    expect(formatWeight(100, "kg")).toBe("100.0 kg");
    expect(formatWeight(100.0, "kg")).toBe("100.0 kg");
  });

  test("uses correct conversion factors", () => {
    const weight = 100;
    const lbsResult = parseFloat(formatWeight(weight, "lbs").split(" ")[0]);
    // Use toBeCloseTo instead of toBe for floating point comparisons
    expect(lbsResult).toBeCloseTo(weight * UNITS.CONVERSION.KG_TO_LBS, 1);
  });
});

describe("formatPercentage", () => {
  test("formats percentages without decimal places", () => {
    expect(formatPercentage(0.756)).toBe("76%");
    expect(formatPercentage(0.5)).toBe("50%");
    expect(formatPercentage(0.123)).toBe("12%");
  });

  test("handles edge cases", () => {
    expect(formatPercentage(0)).toBe("0%");
    expect(formatPercentage(1)).toBe("100%");
  });

  test("handles numbers greater than 1", () => {
    expect(formatPercentage(1.5)).toBe("150%");
  });

  test("rounds percentages correctly", () => {
    expect(formatPercentage(0.666)).toBe("67%"); // Rounds to nearest whole number
    expect(formatPercentage(0.333)).toBe("33%");
    expect(formatPercentage(0.995)).toBe("100%");
  });

  test("handles small decimals", () => {
    expect(formatPercentage(0.001)).toBe("0%");
    expect(formatPercentage(0.009)).toBe("1%"); // Tests rounding up from very small
  });
});
