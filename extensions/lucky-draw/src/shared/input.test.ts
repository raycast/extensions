import { describe, expect, it } from "vitest";

import { parseInclusiveRange, parsePositiveInteger, requireNonEmptyInput, splitInputList, trimInput } from "./input";

describe("shared/input", () => {
  it("trims whitespace and splits lists", () => {
    expect(trimInput("  hello  ")).toBe("hello");
    expect(splitInputList(" apple,\n banana ,, carrot \n")).toEqual(["apple", "banana", "carrot"]);
  });

  it("rejects empty input", () => {
    expect(() => requireNonEmptyInput("   ", "name")).toThrow("name cannot be empty");
  });

  it("parses positive integers and inclusive ranges", () => {
    expect(parsePositiveInteger(" 3 ", "count")).toBe(3);
    expect(parseInclusiveRange("1", "4")).toEqual({ max: 4, min: 1 });
  });

  it("rejects invalid ranges", () => {
    expect(() => parsePositiveInteger("0")).toThrow("value must be a positive whole number");
    expect(() => parseInclusiveRange("5", "4")).toThrow("max must be greater than or equal to min");
  });
});
