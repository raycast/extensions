import { describe, it, expect } from "vitest";
import { normalizeText, resolveQueryToUrl } from "./query";
import type { ResolvedPrefs } from "./preferences";

const base: ResolvedPrefs = {
  engine: "duckduckgo",
  customSearchUrl: undefined,
  browser: undefined,
  openUrlsDirectly: true,
};

describe("normalizeText", () => {
  it("collapses newlines and runs of whitespace, and trims", () => {
    expect(normalizeText("  hello   world  ")).toBe("hello world");
    expect(normalizeText("line one\nline two")).toBe("line one line two");
    expect(normalizeText("a\t\t b")).toBe("a b");
  });
});

describe("resolveQueryToUrl", () => {
  it("returns null for empty/whitespace/undefined", () => {
    expect(resolveQueryToUrl("", base)).toBeNull();
    expect(resolveQueryToUrl("   \n  ", base)).toBeNull();
    expect(resolveQueryToUrl(undefined, base)).toBeNull();
  });

  it("searches a multi-word query", () => {
    expect(resolveQueryToUrl("rust lifetimes", base)).toBe("https://duckduckgo.com/?q=rust%20lifetimes");
  });

  it("opens a URL directly when openUrlsDirectly is on", () => {
    expect(resolveQueryToUrl("github.com/raycast/extensions", base)).toBe("https://github.com/raycast/extensions");
  });

  it("searches the URL text when openUrlsDirectly is off", () => {
    const prefs = { ...base, openUrlsDirectly: false };
    expect(resolveQueryToUrl("github.com", prefs)).toBe("https://duckduckgo.com/?q=github.com");
  });

  it("collapses a multi-line selection before searching", () => {
    expect(resolveQueryToUrl("foo\nbar", base)).toBe("https://duckduckgo.com/?q=foo%20bar");
  });

  it("respects a custom engine", () => {
    const prefs = { ...base, engine: "custom" as const, customSearchUrl: "https://x.com/s?q={query}" };
    expect(resolveQueryToUrl("hi there", prefs)).toBe("https://x.com/s?q=hi%20there");
  });
});
