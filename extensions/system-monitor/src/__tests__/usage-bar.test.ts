import { describe, expect, it } from "vitest";

import { usageBar } from "../lib/usage-bar";

describe("usageBar", () => {
  it("fills proportionally to the percentage", () => {
    expect(usageBar(0)).toBe("░░░░░░░░░░");
    expect(usageBar(50)).toBe("▓▓▓▓▓░░░░░");
    expect(usageBar(100)).toBe("▓▓▓▓▓▓▓▓▓▓");
  });

  it("rounds to the nearest cell", () => {
    expect(usageBar(27)).toBe("▓▓▓░░░░░░░");
    expect(usageBar(96)).toBe("▓▓▓▓▓▓▓▓▓▓");
  });

  it("clamps out-of-range values", () => {
    expect(usageBar(-5)).toBe("░░░░░░░░░░");
    expect(usageBar(140)).toBe("▓▓▓▓▓▓▓▓▓▓");
  });

  it("honours a custom width", () => {
    expect(usageBar(50, 4)).toBe("▓▓░░");
  });
});
