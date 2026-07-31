import { describe, it, expect } from "vitest";
import { parsePositiveIntOrUndefined } from "./parse";

describe("parsePositiveIntOrUndefined", () => {
  it("returns undefined for empty/whitespace", () => {
    expect(parsePositiveIntOrUndefined("")).toBeUndefined();
    expect(parsePositiveIntOrUndefined("   ")).toBeUndefined();
  });
  it("parses a positive integer", () => {
    expect(parsePositiveIntOrUndefined("30")).toBe(30);
  });
  it("throws on zero, negatives, decimals, and non-numbers", () => {
    expect(() => parsePositiveIntOrUndefined("0")).toThrow();
    expect(() => parsePositiveIntOrUndefined("-1")).toThrow();
    expect(() => parsePositiveIntOrUndefined("1.5")).toThrow();
    expect(() => parsePositiveIntOrUndefined("abc")).toThrow();
  });
});
