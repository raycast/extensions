import { describe, expect, it } from "vitest";
import { buildHudText } from "./clipboard";

describe("buildHudText", () => {
  it("returns base success text when reduction is 0", () => {
    expect(buildHudText(0)).toBe("✓ Bougie!");
  });

  it("includes reduction percentage when greater than 0", () => {
    expect(buildHudText(42)).toBe("✓ Bougie! (42% rinsed)");
  });

  it("includes reduction percentage of 1", () => {
    expect(buildHudText(1)).toBe("✓ Bougie! (1% rinsed)");
  });

  it("includes reduction percentage of 100", () => {
    expect(buildHudText(100)).toBe("✓ Bougie! (100% rinsed)");
  });
});
