import { describe, it, expect } from "vitest";
import { extractBareDomain } from "./extractBareDomain";

describe("extractBareDomain (EXT-03)", () => {
  it("extracts allowlisted TLD", () => {
    const result = extractBareDomain("see example.com page");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "example.com",
      url: "https://example.com",
      type: "web",
    });
  });

  it("extracts .io, .dev, .app, .co, .ai", () => {
    const result = extractBareDomain("a fly.io b vercel.app c anthropic.ai");
    expect(result.map((i) => i.url)).toEqual(["https://fly.io", "https://vercel.app", "https://anthropic.ai"]);
  });

  it("rejects non-allowlisted TLD (.pdf, .md, .txt)", () => {
    expect(extractBareDomain("see report.pdf and notes.md")).toEqual([]);
  });

  it("skips www.-prefixed (handled by extractWww)", () => {
    expect(extractBareDomain("www.example.com")).toEqual([]);
  });

  it("skips email addresses", () => {
    expect(extractBareDomain("foo@example.com")).toEqual([]);
  });

  it("skips host inside an http URL", () => {
    expect(extractBareDomain("https://example.com")).toEqual([]);
  });

  it("strips trailing punctuation", () => {
    const result = extractBareDomain("at example.com.");
    expect(result[0].raw).toBe("example.com");
  });

  it("captures path suffix", () => {
    const result = extractBareDomain("github.com/anthropics/anthropic-sdk-python");
    expect(result[0].url).toBe("https://github.com/anthropics/anthropic-sdk-python");
  });
});
