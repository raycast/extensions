import { describe, expect, it } from "vitest";

import { bytesPerSecond } from "../lib/rate";

describe("bytesPerSecond", () => {
  it("normalizes byte deltas by elapsed milliseconds", () => {
    expect(bytesPerSecond(10_000, 10_000)).toBe(1000);
    expect(bytesPerSecond(5000, 5000)).toBe(1000);
  });

  it("returns zero for non-positive input", () => {
    expect(bytesPerSecond(0, 1000)).toBe(0);
    expect(bytesPerSecond(1000, 0)).toBe(0);
    expect(bytesPerSecond(-100, 1000)).toBe(0);
  });
});
