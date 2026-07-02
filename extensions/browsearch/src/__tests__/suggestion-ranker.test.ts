import { describe, it, expect } from "vitest";
import { looksLikeUrl, resolveRawOpenTarget, rankSuggestions } from "../services/suggestion-ranker";
import type { MozPlacesRow } from "../types";

const GOOGLE = "https://www.google.com/search?q=";

describe("looksLikeUrl", () => {
  it("detects https URLs", () => {
    expect(looksLikeUrl("https://github.com")).toBe(true);
  });

  it("detects http URLs", () => {
    expect(looksLikeUrl("http://example.com")).toBe(true);
  });

  it("detects bare domains", () => {
    expect(looksLikeUrl("github.com/raycast")).toBe(true);
    expect(looksLikeUrl("example.com")).toBe(true);
  });

  it("rejects plain search terms", () => {
    expect(looksLikeUrl("hello world")).toBe(false);
    expect(looksLikeUrl("raycast tips")).toBe(false);
  });

  it("rejects single words without TLD", () => {
    expect(looksLikeUrl("github")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(looksLikeUrl("  github.com  ")).toBe(true);
    expect(looksLikeUrl("  ")).toBe(false);
  });
});

describe("resolveRawOpenTarget", () => {
  it("returns a search target for a plain query", () => {
    const result = resolveRawOpenTarget("raycast tips", GOOGLE);
    expect(result.kind).toBe("search");
    expect(result.url).toBe(`${GOOGLE}${encodeURIComponent("raycast tips")}`);
  });

  it("returns a url target for a bare domain", () => {
    const result = resolveRawOpenTarget("github.com/raycast", GOOGLE);
    expect(result.kind).toBe("url");
    expect(result.url).toBe("https://github.com/raycast");
  });

  it("returns a url target for an https URL", () => {
    const result = resolveRawOpenTarget("https://example.com/path", GOOGLE);
    expect(result.kind).toBe("url");
    expect(result.url).toBe("https://example.com/path");
  });

  it("uses the provided searchEngineBaseUrl (DuckDuckGo)", () => {
    const DDG = "https://duckduckgo.com/?q=";
    const result = resolveRawOpenTarget("hello world", DDG);
    expect(result.url).toContain("duckduckgo.com");
  });

  it("encodes special chars in the search query", () => {
    const result = resolveRawOpenTarget("c++ templates", GOOGLE);
    expect(result.url).not.toContain("++");
    expect(result.url).toContain(encodeURIComponent("c++ templates"));
  });
});

describe("rankSuggestions — prefix weighting", () => {
  function row(url: string, title: string | null, frecency: number, visit_count = 1): MozPlacesRow {
    return { url, title, frecency, visit_count };
  }

  it("places prefix-matching host before substring-only match at equal frecency", () => {
    const rows = [
      row("https://notyoutube.example.com/some/you/thing", "Has 'you' in path", 500),
      row("https://youtube.com/", "YouTube", 500),
    ];
    const result = rankSuggestions(rows, "you");
    expect(result[0].url).toContain("youtube.com");
  });

  it("still respects frecency within the same prefix tier", () => {
    const rows = [row("https://youtube.com/", "YouTube", 300), row("https://your-site.com/", "Your Site", 500)];
    const result = rankSuggestions(rows, "you");
    expect(result[0].frecency).toBe(500);
  });

  it("does not reorder when all are substring matches (higher frecency wins)", () => {
    const rows = [
      row("https://example.com/watch?v=youtube", "Watch video", 200),
      row("https://another.com/path?ref=your-id", "Some page", 100),
    ];
    const result = rankSuggestions(rows, "you");
    expect(result[0].frecency).toBe(200);
  });

  it("handles empty rows", () => {
    expect(rankSuggestions([], "you")).toEqual([]);
  });

  it("handles empty term — no prefix boost applied", () => {
    const rows = [row("https://github.com/", "GitHub", 100), row("https://youtube.com/", "YouTube", 200)];
    const result = rankSuggestions(rows, "");
    expect(result[0].frecency).toBe(200);
  });
});
