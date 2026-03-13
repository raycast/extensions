import { calculateVolume } from "../volume";
import { VALIDATION } from "../../constants/shared";

describe("calculateVolume", () => {
  test("generates schemes for all training goals", () => {
    const maxWeight = 100;
    const results = calculateVolume(maxWeight);

    const goals = results.map((r) => r.goal);
    expect(goals).toContain("strength");
    expect(goals).toContain("power");
    expect(goals).toContain("hypertrophy");
    expect(goals).toContain("endurance");
  });

  test("calculates correct volume loads", () => {
    const maxWeight = 100;
    const results = calculateVolume(maxWeight);

    results.forEach((result) => {
      const expectedVolume = result.weight * result.scheme.sets * result.scheme.reps;
      expect(result.totalVolume).toBe(expectedVolume);
    });
  });

  test("validates 1RM input", () => {
    // Test invalid inputs
    expect(() => calculateVolume(-1)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateVolume(0)).toThrow(VALIDATION.getWeightError());
    expect(() => calculateVolume(VALIDATION.WEIGHT.MAX + 1)).toThrow(VALIDATION.getWeightError());

    // Test valid input - using 1 as minimum valid weight
    expect(() => calculateVolume(1)).not.toThrow();
    expect(() => calculateVolume(VALIDATION.WEIGHT.MAX)).not.toThrow();
  });

  test("rounds weights appropriately", () => {
    const maxWeight = 100;
    const results = calculateVolume(maxWeight);

    results.forEach((result) => {
      // Check that all weights are multiples of 5
      expect(result.weight % 5).toBe(0);
    });
  });
});
