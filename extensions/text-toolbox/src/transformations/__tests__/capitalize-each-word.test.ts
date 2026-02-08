import { capitalizeEachWord } from "../capitalize-each-word";

describe("capitalizeEachWord", () => {
  it("should capitalize the first letter of each word", () => {
    expect(capitalizeEachWord.transform("hello world")).toBe("Hello World");
  });

  it("should handle already capitalized text", () => {
    expect(capitalizeEachWord.transform("Hello World")).toBe("Hello World");
  });

  it("should handle lowercase text", () => {
    expect(capitalizeEachWord.transform("hello world test")).toBe("Hello World Test");
  });

  it("should handle single word", () => {
    expect(capitalizeEachWord.transform("hello")).toBe("Hello");
  });
});
