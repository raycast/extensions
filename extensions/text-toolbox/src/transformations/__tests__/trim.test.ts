import { trim } from "../trim";

describe("trim", () => {
  it("should remove leading whitespace", () => {
    expect(trim.transform("  hello")).toBe("hello");
  });

  it("should remove trailing whitespace", () => {
    expect(trim.transform("hello  ")).toBe("hello");
  });

  it("should remove both leading and trailing whitespace", () => {
    expect(trim.transform("  hello  ")).toBe("hello");
  });

  it("should handle text with no whitespace", () => {
    expect(trim.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(trim.transform("")).toBe("");
  });

  it("should preserve internal whitespace", () => {
    expect(trim.transform("  hello world  ")).toBe("hello world");
  });

  it("should handle tabs and newlines", () => {
    expect(trim.transform("\t\nhello\n\t")).toBe("hello");
  });
});
