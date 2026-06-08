import { describe, expect, it } from "vitest";

import rollDice, { rollSingleDie } from "./roll-dice";

describe("rollDice", () => {
  it("rolls the requested quantity with the requested sides", () => {
    const rolls = rollDice({ quantity: 3, random: () => 0.5, sides: 8 });

    expect(rolls).toEqual([5, 5, 5]);
  });

  it("defaults to one six-sided die", () => {
    expect(rollDice({ random: () => 0 })).toEqual([1]);
  });

  it("rolls a single six-sided die", () => {
    expect(rollSingleDie(() => 0.99)).toBe(6);
  });
});
