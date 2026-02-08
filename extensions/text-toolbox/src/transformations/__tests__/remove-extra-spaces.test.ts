import { removeExtraSpaces } from "../remove-extra-spaces";

describe("removeExtraSpaces", () => {
  it("should collapse multiple spaces to single space", () => {
    expect(removeExtraSpaces.transform("hello    world")).toBe("hello world");
  });

  it("should handle multiple sequences of extra spaces", () => {
    expect(removeExtraSpaces.transform("hello   world   test")).toBe("hello world test");
  });

  it("should handle text with single spaces", () => {
    expect(removeExtraSpaces.transform("hello world")).toBe("hello world");
  });

  it("should handle text with no spaces", () => {
    expect(removeExtraSpaces.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(removeExtraSpaces.transform("")).toBe("");
  });

  it("should trim leading and trailing spaces", () => {
    expect(removeExtraSpaces.transform("  hello world  ")).toBe("hello world");
  });
});
