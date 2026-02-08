import { snakeUpperCase } from "../snake-upper-case";

describe("snakeUpperCase", () => {
  it("should convert space-separated words to SNAKE_UPPER_CASE", () => {
    expect(snakeUpperCase.transform("hello world")).toBe("HELLO_WORLD");
  });

  it("should convert camelCase to SNAKE_UPPER_CASE", () => {
    expect(snakeUpperCase.transform("helloWorld")).toBe("HELLO_WORLD");
  });

  it("should convert kebab-case to SNAKE_UPPER_CASE", () => {
    expect(snakeUpperCase.transform("hello-world")).toBe("HELLO_WORLD");
  });
});
