import { reverseLines } from "../reverse-lines";

describe("reverseLines", () => {
  it("should reverse the order of lines", () => {
    const input = "first\nsecond\nthird";
    const expected = "third\nsecond\nfirst";
    expect(reverseLines.transform(input)).toBe(expected);
  });

  it("should handle single line", () => {
    expect(reverseLines.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(reverseLines.transform("")).toBe("");
  });

  it("should handle two lines", () => {
    const input = "first\nsecond";
    const expected = "second\nfirst";
    expect(reverseLines.transform(input)).toBe(expected);
  });

  it("should reverse twice to get original", () => {
    const original = "first\nsecond\nthird";
    const reversed = reverseLines.transform(original);
    const reversedAgain = reverseLines.transform(reversed);
    expect(reversedAgain).toBe(original);
  });
});
