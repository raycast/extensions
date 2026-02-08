import { camelcase } from "../camelcase";

describe("camelcase", () => {
  it("should convert space-separated words to camelCase", () => {
    expect(camelcase.transform("hello world")).toBe("helloWorld");
  });

  it("should convert snake_case to camelCase", () => {
    expect(camelcase.transform("hello_world_test")).toBe("helloWorldTest");
  });

  it("should convert kebab-case to camelCase", () => {
    expect(camelcase.transform("hello-world-test")).toBe("helloWorldTest");
  });

  it("should handle single word", () => {
    expect(camelcase.transform("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(camelcase.transform("")).toBe("");
  });
});
