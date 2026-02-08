import { kebabcase } from "../kebabcase";

describe("kebabcase", () => {
  it("should convert space-separated words to kebab-case", () => {
    expect(kebabcase.transform("hello world")).toBe("hello-world");
  });

  it("should convert camelCase to kebab-case", () => {
    expect(kebabcase.transform("helloWorld")).toBe("hello-world");
  });

  it("should convert snake_case to kebab-case", () => {
    expect(kebabcase.transform("hello_world")).toBe("hello-world");
  });

  it("should handle already kebab-case", () => {
    expect(kebabcase.transform("hello-world")).toBe("hello-world");
  });
});
