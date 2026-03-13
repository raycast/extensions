import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../lib/inventory";
import { searchInventory } from "../lib/search";

describe("searchInventory", () => {
  const items: InventoryItem[] = [
    {
      id: "numpy.linspace",
      name: "numpy.linspace",
      shortName: "linspace",
      role: "py:function",
      url: "https://example.com/linspace",
      docPath: "reference/generated/numpy.linspace.html#numpy.linspace",
      displayName: "numpy.linspace",
    },
    {
      id: "numpy.linalg.norm",
      name: "numpy.linalg.norm",
      shortName: "linalg.norm",
      role: "py:function",
      url: "https://example.com/norm",
      docPath: "reference/generated/numpy.linalg.norm.html#numpy.linalg.norm",
      displayName: "numpy.linalg.norm",
    },
    {
      id: "numpy.ndarray.any",
      name: "numpy.ndarray.any",
      shortName: "ndarray.any",
      role: "py:method",
      url: "https://example.com/ndarray.any",
      docPath: "reference/generated/numpy.ndarray.any.html#numpy.ndarray.any",
      displayName: "numpy.ndarray.any",
    },
  ];

  it("returns prefix matches first", () => {
    const results = searchInventory(items, "lin");
    expect(results[0]?.id).toBe("numpy.linspace");
  });

  it("matches short names when numpy prefix omitted", () => {
    const results = searchInventory(items, "norm");
    expect(results.some((item) => item.id === "numpy.linalg.norm")).toBe(true);
  });

  it("limits the number of results", () => {
    const results = searchInventory(items, "numpy");
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
