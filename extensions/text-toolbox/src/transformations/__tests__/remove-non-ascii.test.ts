import { removeNonAscii } from "../remove-non-ascii";

describe("removeNonAscii", () => {
  it("should remove emoji characters", () => {
    expect(removeNonAscii.transform("hello 👋 world")).toBe("hello  world");
  });

  it("should remove accented characters", () => {
    expect(removeNonAscii.transform("café")).toBe("caf");
  });

  it("should keep ASCII characters", () => {
    expect(removeNonAscii.transform("hello world 123!")).toBe("hello world 123!");
  });

  it("should handle empty string", () => {
    expect(removeNonAscii.transform("")).toBe("");
  });

  it("should handle text with only ASCII", () => {
    expect(removeNonAscii.transform("Hello World")).toBe("Hello World");
  });

  it("should remove Unicode characters", () => {
    expect(removeNonAscii.transform("hello → world")).toBe("hello  world");
  });
});
