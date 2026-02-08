import { sortLines } from "../sort-lines";

describe("sortLines", () => {
  it("should sort lines alphabetically", () => {
    const input = "zebra\napple\nbanana";
    const expected = "apple\nbanana\nzebra";
    expect(sortLines.transform(input)).toBe(expected);
  });

  it("should handle already sorted lines", () => {
    const input = "apple\nbanana\nzebra";
    expect(sortLines.transform(input)).toBe(input);
  });

  it("should handle single line", () => {
    expect(sortLines.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(sortLines.transform("")).toBe("");
  });

  it("should handle lines with numbers", () => {
    const input = "10\n2\n1\n20";
    const expected = "1\n10\n2\n20";
    expect(sortLines.transform(input)).toBe(expected);
  });

  it("should be case-sensitive", () => {
    const input = "Zebra\napple\nBanana";
    const result = sortLines.transform(input);
    expect(result.indexOf("Banana")).toBeLessThan(result.indexOf("Zebra"));
  });
});
