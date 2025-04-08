import { calculateWarmupSets } from "../warmup";
import { WARMUP_SCHEMES } from "../../constants/warmup";
import { VALIDATION, UNITS } from "../../constants/shared";

describe("calculateWarmupSets", () => {
  test("generates correct number of warmup sets", () => {
    const sets = calculateWarmupSets(100);
    expect(sets).toHaveLength(WARMUP_SCHEMES.length);
  });

  test("calculates correct progression percentages", () => {
    const sets = calculateWarmupSets(100);
    sets.forEach((set, index) => {
      expect(set.percentage).toBe(WARMUP_SCHEMES[index].percentage);
    });
  });

  test("rounds weights to nearest plate increment", () => {
    const workingWeight = 100;
    const sets = calculateWarmupSets(workingWeight);

    sets.forEach((set) => {
      const increment = UNITS.INCREMENTS.KG;
      const remainder = set.weight % increment;
      expect(remainder).toBe(0); // Should be divisible by increment
    });
  });

  test("maintains ascending weight order", () => {
    const sets = calculateWarmupSets(100);
    let previousWeight = 0;

    sets.forEach((set) => {
      expect(set.weight).toBeGreaterThan(previousWeight);
      previousWeight = set.weight;
    });
  });

  test("correctly identifies working set", () => {
    const sets = calculateWarmupSets(100);
    const workingSet = sets.find((set) => set.isWorkingSet);
    const nonWorkingSets = sets.filter((set) => !set.isWorkingSet);

    expect(workingSet).toBeDefined();
    expect(workingSet?.percentage).toBe(1.0);
    expect(nonWorkingSets.length).toBe(sets.length - 1);
  });

  test("assigns correct reps to each set", () => {
    const sets = calculateWarmupSets(100);
    sets.forEach((set, index) => {
      expect(set.reps).toBe(WARMUP_SCHEMES[index].reps);
    });
  });

  test("handles validation for working weight", () => {
    // Test negative and zero weights
    expect(() => calculateWarmupSets(-10)).toThrow();
    expect(() => calculateWarmupSets(0)).toThrow();

    // Test maximum weight
    expect(() => calculateWarmupSets(VALIDATION.WEIGHT.MAX + 1)).toThrow();
  });

  test("calculates warmup sets for various working weights", () => {
    const testWeights = [50, 100, 150, 200];

    testWeights.forEach((weight) => {
      const sets = calculateWarmupSets(weight);

      // Last set should be working weight
      expect(sets[sets.length - 1].weight).toBe(weight);

      // Check each set is properly calculated
      sets.forEach((set, index) => {
        const expectedWeight =
          Math.round((weight * WARMUP_SCHEMES[index].percentage) / UNITS.INCREMENTS.KG) * UNITS.INCREMENTS.KG;
        expect(set.weight).toBe(expectedWeight);
      });
    });
  });

  test("handles decimal working weights", () => {
    const sets = calculateWarmupSets(102.5);
    sets.forEach((set) => {
      // Check that all weights are multiples of the plate increment
      const increment = UNITS.INCREMENTS.KG;
      expect(set.weight % increment).toBe(0);
    });
  });
});
