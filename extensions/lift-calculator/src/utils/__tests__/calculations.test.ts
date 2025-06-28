import { Color } from "@raycast/api";
import { calculateOneRepMax, generateResults, getErrorResult } from "../calculations";
import { VALIDATION, EPLEY } from "../../constants/shared";

describe("calculateOneRepMax", () => {
  test("calculates 1RM correctly for valid inputs", () => {
    // Let's calculate the expected values using the Epley formula directly
    const calculate = (weight: number, reps: number) => weight * (EPLEY.MULTIPLIER + EPLEY.COEFFICIENT * reps);

    // Test case 1: 100kg x 5 reps
    const expected1 = calculate(100, 5);
    expect(calculateOneRepMax(100, 5)).toBe(expected1);

    // Test case 2: 225kg x 3 reps
    const expected2 = calculate(225, 3);
    expect(calculateOneRepMax(225, 3)).toBe(expected2);

    // Let's also verify some known Epley formula results
    // 100kg x 5 should be approximately 116.65kg
    expect(calculateOneRepMax(100, 5)).toBeCloseTo(116.65, 1);
  });

  test("throws error for invalid weight", () => {
    expect(() => calculateOneRepMax(-10, 5)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateOneRepMax(0, 5)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateOneRepMax(1001, 5)).toThrow(VALIDATION.getWeightError());
  });

  test("accepts valid weight range", () => {
    expect(() => calculateOneRepMax(1, 5)).not.toThrow();
    expect(() => calculateOneRepMax(1000, 5)).not.toThrow();
  });

  test("throws error for invalid reps", () => {
    expect(() => calculateOneRepMax(100, 0)).toThrow(VALIDATION.getRepsError());
    expect(() => calculateOneRepMax(100, 101)).toThrow(VALIDATION.getRepsError());
  });
});

describe("generateResults", () => {
  test("generates correct results array", () => {
    const results = generateResults(100);

    expect(results).toHaveLength(7); // We have 7 schemes defined
    expect(results[0].value).toBe(100); // First should be 100% of 1RM
    expect(results[0].percentage).toBe(1.0);

    // Check structure of result objects
    results.forEach((result) => {
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("tintColor");
      expect(result).toHaveProperty("icon");
      expect(result).toHaveProperty("percentage");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("scheme");
    });
  });
});

describe("getErrorResult", () => {
  test("returns error result with custom message", () => {
    const customMsg = "Custom error";
    const result = getErrorResult(customMsg);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(customMsg);
    expect(result[0].tintColor).toBe(Color.Red);
  });

  test("returns error result with default message", () => {
    const result = getErrorResult();

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("Please enter weight and repetitions");
  });
});
