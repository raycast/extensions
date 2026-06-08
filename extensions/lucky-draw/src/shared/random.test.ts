import { describe, expect, it } from "vitest";

import { pickRandom, randomIntInclusive, shuffleList } from "./random";

describe("shared/random", () => {
  it("generates inclusive integers from deterministic random values", () => {
    expect(randomIntInclusive(1, 6, () => 0)).toBe(1);
    expect(randomIntInclusive(1, 6, () => 0.999)).toBe(6);
  });

  it("rejects invalid random integer bounds", () => {
    expect(() => randomIntInclusive(1.5, 6)).toThrow("Bounds must be whole numbers");
    expect(() => randomIntInclusive(6, 1)).toThrow("Max must be greater than or equal to min");
  });

  it("picks a deterministic item and rejects empty lists", () => {
    expect(pickRandom(["alpha", "beta", "gamma"], () => 0.5)).toBe("beta");
    expect(() => pickRandom([])).toThrow("Cannot pick from an empty list");
  });

  it("shuffles without mutating the input list", () => {
    const items = ["alpha", "beta", "gamma"];
    const randomValues = [0, 0];
    const shuffled = shuffleList(items, () => randomValues.shift() ?? 0);

    expect(shuffled).toEqual(["beta", "gamma", "alpha"]);
    expect(items).toEqual(["alpha", "beta", "gamma"]);
  });
});
