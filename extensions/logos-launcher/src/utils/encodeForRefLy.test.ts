import { describe, it, expect } from "vitest";
import { encodeForRefLy } from "./encodeForRefLy";

describe("encodeForRefLy", () => {
  it("encodes spaces as plus signs", () => {
    expect(encodeForRefLy("hello world")).toBe("hello+world");
  });

  it("encodes special characters correctly", () => {
    expect(encodeForRefLy("John 3:16")).toBe("John+3%3A16");
  });

  it("handles empty string", () => {
    expect(encodeForRefLy("")).toBe("");
  });

  it("encodes multiple spaces", () => {
    expect(encodeForRefLy("a b c")).toBe("a+b+c");
  });

  it("preserves alphanumeric characters", () => {
    expect(encodeForRefLy("abc123")).toBe("abc123");
  });

  it("encodes ampersand", () => {
    expect(encodeForRefLy("foo&bar")).toBe("foo%26bar");
  });

  it("does not encode parentheses (as per encodeURIComponent)", () => {
    // Note: encodeURIComponent does not encode: - _ . ! ~ * ' ( )
    expect(encodeForRefLy("(test)")).toBe("(test)");
  });

  it("handles guide title with spaces", () => {
    expect(encodeForRefLy("My Exegetical Guide")).toBe("My+Exegetical+Guide");
  });

  it("handles Bible reference format", () => {
    expect(encodeForRefLy("BibleESV.Mt5.1-12")).toBe("BibleESV.Mt5.1-12");
  });
});
