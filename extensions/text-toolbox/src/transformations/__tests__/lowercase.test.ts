import { lowercase } from "../lowercase";

describe("lowercase", () => {
  it("should convert text to lowercase", () => {
    expect(lowercase.transform("HELLO WORLD")).toBe("hello world");
  });

  it("should handle already lowercase text", () => {
    expect(lowercase.transform("hello world")).toBe("hello world");
  });

  it("should handle mixed case", () => {
    expect(lowercase.transform("HeLLo WoRLd")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(lowercase.transform("")).toBe("");
  });
});
