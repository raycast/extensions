import { describe, expect, it } from "vitest";
import { resolveTextInput } from "../src/lib/resolve-text-input";

describe("resolveTextInput", () => {
  it("prefers the command argument over the clipboard", () => {
    expect(resolveTextInput(" https://example.com?utm=1 ", "https://other.com")).toBe("https://example.com?utm=1");
  });

  it("falls back to the clipboard when the argument is empty", () => {
    expect(resolveTextInput("  ", "https://example.com?ref=1")).toBe("https://example.com?ref=1");
    expect(resolveTextInput(undefined, "https://example.com?ref=1")).toBe("https://example.com?ref=1");
  });

  it("returns null when both sources are empty", () => {
    expect(resolveTextInput(undefined, undefined)).toBeNull();
    expect(resolveTextInput("", "   ")).toBeNull();
  });
});
