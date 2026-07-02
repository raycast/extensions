import { describe, it, expect } from "vitest";
import { isCacheStale } from "../utils/cache";

describe("isCacheStale", () => {
  it("returns true when source is newer than cached", () => {
    const sourceMaxMtime = 2000;
    const cachedMtime = 1000;
    expect(isCacheStale(sourceMaxMtime, cachedMtime)).toBe(true);
  });

  it("returns false when cached is as new as source", () => {
    expect(isCacheStale(1000, 1000)).toBe(false);
  });

  it("returns false when cached is newer than source (no-op case)", () => {
    expect(isCacheStale(1000, 2000)).toBe(false);
  });

  it("returns true when cachedMtime is null (no cache yet)", () => {
    expect(isCacheStale(1000, null)).toBe(true);
  });
});
