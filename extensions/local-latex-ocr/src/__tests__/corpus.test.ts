import { describe, expect, it } from "vitest";
import { corpus } from "../../benchmarks/corpus-v1.mjs";

describe("v1 corpus definition", () => {
  it("contains 150 formulas across the required printed-math categories", () => {
    expect(corpus).toHaveLength(150);
    expect(new Set(corpus.map((entry) => entry.category))).toEqual(
      new Set([
        "fraction",
        "radical",
        "integral",
        "summation",
        "greek",
        "accent",
        "matrix",
        "cases",
        "multiline",
        "long",
      ]),
    );
  });
});
