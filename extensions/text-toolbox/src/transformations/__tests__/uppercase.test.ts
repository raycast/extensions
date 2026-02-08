import { uppercase } from "../uppercase";

describe("uppercase", () => {
  it("should convert text to uppercase", () => {
    expect(uppercase.transform("hello world")).toBe("HELLO WORLD");
  });

  it("should handle already uppercase text", () => {
    expect(uppercase.transform("HELLO WORLD")).toBe("HELLO WORLD");
  });

  it("should handle mixed case", () => {
    expect(uppercase.transform("HeLLo WoRLd")).toBe("HELLO WORLD");
  });

  it("should handle empty string", () => {
    expect(uppercase.transform("")).toBe("");
  });

  it("should handle special characters", () => {
    expect(uppercase.transform("hello-world_123")).toBe("HELLO-WORLD_123");
  });
});
