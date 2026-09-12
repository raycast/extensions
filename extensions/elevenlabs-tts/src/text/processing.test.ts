import { getTextPreview, getTextStats } from "./processing";

describe("getTextPreview", () => {
  it("should return full text when under max length", () => {
    const text = "Hello world";
    expect(getTextPreview(text)).toBe("Hello world");
  });

  it("should truncate text when over max length", () => {
    const longText = "This is a very long text that should be truncated at some point";
    expect(getTextPreview(longText, 20)).toBe("This is a very long ...");
  });

  it("should handle empty strings", () => {
    expect(getTextPreview("")).toBe("");
  });

  it("should trim whitespace", () => {
    expect(getTextPreview("  Hello world  ")).toBe("Hello world");
  });
});

describe("getTextStats", () => {
  it("should count words correctly", () => {
    expect(getTextStats("Hello world").wordCount).toBe(2);
  });

  it("should handle multiple spaces between words", () => {
    expect(getTextStats("Hello   world").wordCount).toBe(2);
  });

  it("should count characters correctly", () => {
    expect(getTextStats("Hello world").charCount).toBe(11);
  });

  it("should handle empty strings", () => {
    const stats = getTextStats("");
    expect(stats.wordCount).toBe(0);
    expect(stats.charCount).toBe(0);
  });

  it("should handle strings with only whitespace", () => {
    const stats = getTextStats("   ");
    expect(stats.wordCount).toBe(0);
    expect(stats.charCount).toBe(3);
  });
});
