import { describe, it, expect } from "vitest";
import { getPageParams, computeHasMore } from "./pagination";

describe("getPageParams", () => {
  it("converts a 0-indexed page into limit/offset", () => {
    expect(getPageParams(0, 50)).toEqual({ limit: 50, offset: 0 });
    expect(getPageParams(2, 50)).toEqual({ limit: 50, offset: 100 });
  });
});

describe("computeHasMore", () => {
  it("is true when more rows remain", () => {
    expect(computeHasMore(0, 50, 120)).toBe(true);
  });
  it("is false when the page reaches the end", () => {
    expect(computeHasMore(100, 20, 120)).toBe(false);
    expect(computeHasMore(0, 10, 10)).toBe(false);
  });
});
