import { snakecase } from "../snakecase";

describe("snakecase", () => {
  it("should convert space-separated words to snake_case", () => {
    expect(snakecase.transform("hello world")).toBe("hello_world");
  });

  it("should convert camelCase to snake_case", () => {
    expect(snakecase.transform("helloWorld")).toBe("hello_world");
  });

  it("should convert kebab-case to snake_case", () => {
    expect(snakecase.transform("hello-world")).toBe("hello_world");
  });

  it("should handle already snake_case", () => {
    expect(snakecase.transform("hello_world")).toBe("hello_world");
  });
});
