import { describe, expect, it } from "vitest";
import { clampPercent, formatBytes } from "../src/lib/format";

describe("formatting", () => {
  it("normalizes fractional and percentage progress", () => {
    expect(clampPercent(0.42)).toBe(42);
    expect(clampPercent("42")).toBe(42);
    expect(clampPercent(140)).toBe(100);
  });

  it("formats storage values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(128 * 1024 ** 3)).toBe("128 GB");
  });
});
