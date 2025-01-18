import { validateSelectedText } from "./validation";

describe("validateSelectedText", () => {
  it("should return valid text unchanged", () => {
    const text = "Hello world";
    expect(validateSelectedText(text)).toBe(text);
  });

  it("should throw error for empty string", () => {
    expect(() => validateSelectedText("")).toThrow("No text selected - Select text and try again");
  });

  it("should throw error for whitespace-only string", () => {
    expect(() => validateSelectedText("   ")).toThrow("No text selected - Select text and try again");
  });

  it("should throw error for null or undefined", () => {
    expect(() => validateSelectedText(undefined as unknown as string)).toThrow(
      "No text selected - Select text and try again",
    );
  });
});
