import { describe, expect, it, vi } from "vitest";

import pickRandomItem, { removeItemAtIndex, sanitizeItem } from "./pick-random-item";

describe("pickRandomItem", () => {
  it("picks an item using Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);

    expect(pickRandomItem({ items: ["alpha", "beta", "gamma", "delta"] })).toBe("delta");
  });

  it("sanitizes items by trimming whitespace", () => {
    expect(sanitizeItem("  option  ")).toBe("option");
  });

  it("removes the item at the requested index without mutating the input", () => {
    const items = ["alpha", "beta", "gamma"];

    expect(removeItemAtIndex(items, 1)).toEqual(["alpha", "gamma"]);
    expect(items).toEqual(["alpha", "beta", "gamma"]);
  });
});
