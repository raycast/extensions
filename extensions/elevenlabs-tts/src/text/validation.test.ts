import { validateCopiedText, validateSelectedText } from "./validation";

describe("validateSelectedText", () => {
  it("should return valid text unchanged", () => {
    const text = "Hello world";
    expect(validateSelectedText(text)).toBe(text);
  });

  it("should throw error for empty string", () => {
    expect(() => validateSelectedText("")).toThrow("No text selected");
  });

  it("should throw error for whitespace-only string", () => {
    expect(() => validateSelectedText("   ")).toThrow("No text selected");
  });

  it("should throw error for null or undefined", () => {
    expect(() => validateSelectedText(undefined as unknown as string)).toThrow("No text selected");
  });
});

describe("validateCopiedText", () => {
  it("should return valid text unchanged", () => {
    const text = "Hello world";
    expect(validateCopiedText(text)).toBe(text);
  });

  it("should throw error for empty clipboard text", () => {
    expect(() => validateCopiedText(undefined)).toThrow("No text copied");
    expect(() => validateCopiedText("   ")).toThrow("No text copied");
  });
});
