import { describe, expect, it, vi } from "vitest";

import generateNumber, { formatGenerateNumberMarkdown } from "./generate-number";

describe("generateNumber", () => {
  it("generates a number within an inclusive range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(generateNumber({ max: 10, min: 1 })).toBe(6);
  });

  it("returns the bound when min and max are equal", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    expect(generateNumber({ max: 4, min: 4 })).toBe(4);
  });

  it("rejects ranges where max is lower than min", () => {
    expect(() => generateNumber({ max: 1, min: 2 })).toThrow("Max must be greater than min");
  });

  it("formats generated numbers as markdown", () => {
    expect(formatGenerateNumberMarkdown(42)).toBe("# 42");
  });
});
