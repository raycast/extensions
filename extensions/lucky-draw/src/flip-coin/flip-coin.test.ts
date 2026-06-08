import { describe, expect, it } from "vitest";

import { flipCoin } from "./flip-coin";

describe("flipCoin", () => {
  it("returns heads for higher random values", () => {
    expect(flipCoin(() => 0.9)).toBe("heads");
  });

  it("returns tails for lower random values", () => {
    expect(flipCoin(() => 0.1)).toBe("tails");
  });
});
