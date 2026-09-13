import { describe, expect, it } from "vitest";
import { pickVariant } from "../../src/core/variant";
import type { Variant } from "../../src/types";

function variants(...heights: number[]): Variant[] {
  return heights.map((height) => ({
    url: `https://cdn.example/${height}`,
    height,
    mime: "image/gif",
  }));
}

describe("pickVariant", () => {
  it("returns the exact match when one exists", () => {
    expect(pickVariant(variants(32, 64, 96, 128), 32)?.height).toBe(32);
    expect(pickVariant(variants(32, 64, 96, 128), 128)?.height).toBe(128);
  });

  it("falls back to the closest height when nothing matches exactly", () => {
    expect(pickVariant(variants(28, 56, 112), 32)?.height).toBe(28);
    expect(pickVariant(variants(28, 56, 112), 128)?.height).toBe(112);
  });

  it("ignores the declared scale order and compares real heights", () => {
    expect(pickVariant(variants(112, 28, 56), 32)?.height).toBe(28);
  });

  it("keeps the first candidate when two are equally distant", () => {
    expect(pickVariant(variants(24, 40), 32)?.height).toBe(24);
  });

  it("returns undefined when there is no variant at all", () => {
    expect(pickVariant([], 32)).toBeUndefined();
  });

  it("handles a single variant", () => {
    expect(pickVariant(variants(56), 128)?.height).toBe(56);
  });
});
