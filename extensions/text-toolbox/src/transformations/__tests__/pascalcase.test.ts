import { pascalcase } from "../pascalcase";

describe("pascalcase", () => {
  it("should convert space-separated words to PascalCase", () => {
    expect(pascalcase.transform("hello world")).toBe("HelloWorld");
  });

  it("should convert snake_case to PascalCase", () => {
    expect(pascalcase.transform("hello_world_test")).toBe("HelloWorldTest");
  });

  it("should convert kebab-case to PascalCase", () => {
    expect(pascalcase.transform("hello-world-test")).toBe("HelloWorldTest");
  });

  it("should handle single word", () => {
    expect(pascalcase.transform("hello")).toBe("Hello");
  });
});
