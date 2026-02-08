import { addLineNumbers } from "../add-line-numbers";

describe("addLineNumbers", () => {
  it("should add line numbers to each line", () => {
    const input = "first\nsecond\nthird";
    const result = addLineNumbers.transform(input);
    expect(result).toContain("1. first");
    expect(result).toContain("2. second");
    expect(result).toContain("3. third");
  });

  it("should handle single line", () => {
    const result = addLineNumbers.transform("hello");
    expect(result).toBe("1. hello");
  });

  it("should handle empty string", () => {
    expect(addLineNumbers.transform("")).toBe("1. ");
  });

  it("should number multiple lines correctly", () => {
    const input = "a\nb\nc\nd\ne";
    const result = addLineNumbers.transform(input);
    const lines = result.split("\n");
    expect(lines[0]).toBe("1. a");
    expect(lines[1]).toBe("2. b");
    expect(lines[2]).toBe("3. c");
    expect(lines[3]).toBe("4. d");
    expect(lines[4]).toBe("5. e");
  });

  it("should handle empty lines", () => {
    const input = "first\n\nsecond";
    const result = addLineNumbers.transform(input);
    expect(result).toContain("1. first");
    expect(result).toContain("2. ");
    expect(result).toContain("3. second");
  });
});
