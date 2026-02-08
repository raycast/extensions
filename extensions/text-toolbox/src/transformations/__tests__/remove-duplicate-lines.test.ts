import { removeDuplicateLines } from "../remove-duplicate-lines";

describe("removeDuplicateLines", () => {
  it("should remove duplicate lines", () => {
    const input = "apple\nbanana\napple\ncherry";
    const expected = "apple\nbanana\ncherry";
    expect(removeDuplicateLines.transform(input)).toBe(expected);
  });

  it("should keep first occurrence of duplicates", () => {
    const input = "first\nsecond\nfirst";
    const result = removeDuplicateLines.transform(input);
    expect(result).toBe("first\nsecond");
  });

  it("should handle no duplicates", () => {
    const input = "apple\nbanana\ncherry";
    expect(removeDuplicateLines.transform(input)).toBe(input);
  });

  it("should handle all duplicate lines", () => {
    const input = "test\ntest\ntest";
    expect(removeDuplicateLines.transform(input)).toBe("test");
  });

  it("should handle single line", () => {
    expect(removeDuplicateLines.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(removeDuplicateLines.transform("")).toBe("");
  });

  it("should be case-sensitive", () => {
    const input = "Apple\napple\nAPPLE";
    const result = removeDuplicateLines.transform(input);
    expect(result.split("\n")).toHaveLength(3);
  });
});
