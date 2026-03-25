import { describe, it, expect } from "vitest";
import {
  tokenizeQuery,
  matchesAllTokens,
  filterResults,
  generateContentSnippet,
} from "./search-utils";
import { SearchResult } from "./chrome-utils";

describe("tokenizeQuery", () => {
  it("splits query into lowercase tokens", () => {
    expect(tokenizeQuery("Hello World")).toEqual(["hello", "world"]);
  });

  it("handles multiple spaces", () => {
    expect(tokenizeQuery("hello   world")).toEqual(["hello", "world"]);
  });

  it("returns empty array for empty string", () => {
    expect(tokenizeQuery("")).toEqual([]);
  });

  it("returns empty array for whitespace only", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(tokenizeQuery(null as unknown as string)).toEqual([]);
    expect(tokenizeQuery(undefined as unknown as string)).toEqual([]);
  });

  it("handles single token", () => {
    expect(tokenizeQuery("github")).toEqual(["github"]);
  });

  it("lowercases all tokens", () => {
    expect(tokenizeQuery("GitHub Request")).toEqual(["github", "request"]);
  });

  it("handles tabs and newlines", () => {
    expect(tokenizeQuery("hello\tworld\ntest")).toEqual([
      "hello",
      "world",
      "test",
    ]);
  });
});

describe("matchesAllTokens", () => {
  it("returns true when all tokens are present", () => {
    expect(
      matchesAllTokens("GitHub Pull Request #123", ["github", "request"]),
    ).toBe(true);
  });

  it("returns true for word-order-independent matching", () => {
    expect(matchesAllTokens("GitHub Pull Request", ["request", "github"])).toBe(
      true,
    );
  });

  it("returns false when some tokens are missing", () => {
    expect(matchesAllTokens("GitHub Issues", ["github", "request"])).toBe(
      false,
    );
  });

  it("returns true for empty tokens array", () => {
    expect(matchesAllTokens("anything", [])).toBe(true);
  });

  it("returns false for empty target", () => {
    expect(matchesAllTokens("", ["token"])).toBe(false);
  });

  it("returns false for null/undefined target", () => {
    expect(matchesAllTokens(null as unknown as string, ["token"])).toBe(false);
    expect(matchesAllTokens(undefined as unknown as string, ["token"])).toBe(
      false,
    );
  });

  it("is case insensitive", () => {
    expect(matchesAllTokens("GITHUB Pull REQUEST", ["github", "request"])).toBe(
      true,
    );
  });

  it("matches partial words", () => {
    expect(matchesAllTokens("documentation", ["doc"])).toBe(true);
  });

  it("handles special characters in target", () => {
    expect(matchesAllTokens("user@example.com", ["example"])).toBe(true);
  });
});

describe("filterResults", () => {
  const createResult = (
    id: string,
    title: string,
    url: string,
    source: "tab" | "bookmark" | "history",
    content?: string,
  ): SearchResult => ({
    id,
    title,
    url,
    source,
    content,
  });

  it("returns all results when query is empty", () => {
    const results = [
      createResult("1", "GitHub", "https://github.com", "tab"),
      createResult("2", "Google", "https://google.com", "bookmark"),
    ];

    const filtered = filterResults(results, "");

    expect(filtered).toHaveLength(2);
  });

  it("filters by title", () => {
    const results = [
      createResult(
        "1",
        "GitHub Pull Request",
        "https://github.com/pr/1",
        "tab",
      ),
      createResult("2", "Google Search", "https://google.com", "bookmark"),
    ];

    const filtered = filterResults(results, "github request");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filters by URL", () => {
    const results = [
      createResult("1", "Home", "https://github.com/issues", "tab"),
      createResult("2", "Search", "https://google.com", "bookmark"),
    ];

    const filtered = filterResults(results, "github issues");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filters by domain", () => {
    const results = [
      createResult("1", "Page", "https://docs.example.com/api", "tab"),
      createResult("2", "Other", "https://other.com", "bookmark"),
    ];

    const filtered = filterResults(results, "example");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("filters by content and marks as content match", () => {
    const results = [
      createResult(
        "1",
        "Documentation",
        "https://docs.com",
        "tab",
        "This page contains information about API authentication methods",
      ),
      createResult("2", "Other Page", "https://other.com", "tab"),
    ];

    const filtered = filterResults(results, "authentication methods");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
    expect(filtered[0].isContentMatch).toBe(true);
    expect(filtered[0].contentSnippet).toBeDefined();
  });

  it("does not mark as content match when title/URL also matches", () => {
    const results = [
      createResult(
        "1",
        "Authentication Guide",
        "https://docs.com/auth",
        "tab",
        "This page explains authentication",
      ),
    ];

    const filtered = filterResults(results, "authentication");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].isContentMatch).toBeFalsy();
  });

  it("supports word-order-independent search", () => {
    const results = [
      createResult(
        "1",
        "GitHub Pull Request #123",
        "https://github.com/pr/123",
        "tab",
      ),
    ];

    const filtered = filterResults(results, "request github");

    expect(filtered).toHaveLength(1);
  });

  it("returns empty array when no matches", () => {
    const results = [createResult("1", "GitHub", "https://github.com", "tab")];

    const filtered = filterResults(results, "nonexistent query");

    expect(filtered).toHaveLength(0);
  });

  it("handles whitespace-only query", () => {
    const results = [createResult("1", "GitHub", "https://github.com", "tab")];

    const filtered = filterResults(results, "   ");

    expect(filtered).toHaveLength(1);
  });

  it("handles results with missing title", () => {
    const results: SearchResult[] = [
      {
        id: "1",
        title: "",
        url: "https://github.com",
        source: "tab",
      },
    ];

    const filtered = filterResults(results, "github");

    expect(filtered).toHaveLength(1);
  });

  it("handles results with missing URL", () => {
    const results: SearchResult[] = [
      {
        id: "1",
        title: "GitHub",
        url: "",
        source: "tab",
      },
    ];

    const filtered = filterResults(results, "github");

    expect(filtered).toHaveLength(1);
  });
});

describe("generateContentSnippet", () => {
  it("generates snippet around first match", () => {
    const content =
      "This is some text that contains the search term in the middle of a longer paragraph.";
    const snippet = generateContentSnippet(content, "search");

    expect(snippet).toContain("search");
    expect(snippet.length).toBeLessThanOrEqual(90); // maxLength + ellipsis
  });

  it("adds prefix ellipsis when match is not at start", () => {
    const content = "Some prefix text here and then the keyword appears";
    const snippet = generateContentSnippet(content, "keyword");

    expect(snippet.startsWith("...")).toBe(true);
  });

  it("adds suffix ellipsis when content continues after snippet", () => {
    const content =
      "The keyword appears early but there is much more text that follows and continues for a while longer than the snippet length.";
    const snippet = generateContentSnippet(content, "keyword");

    expect(snippet.endsWith("...")).toBe(true);
  });

  it("returns empty string for empty content", () => {
    expect(generateContentSnippet("", "query")).toBe("");
  });

  it("returns empty string for empty query", () => {
    expect(generateContentSnippet("content", "")).toBe("");
  });

  it("returns empty string when no match found", () => {
    expect(generateContentSnippet("some content", "nonexistent")).toBe("");
  });

  it("normalizes whitespace in snippet", () => {
    const content = "text with\n\nnewlines\t\tand   multiple   spaces";
    const snippet = generateContentSnippet(content, "newlines");

    expect(snippet).not.toContain("\n");
    expect(snippet).not.toContain("\t");
    expect(snippet).not.toContain("  ");
  });

  it("respects custom maxLength", () => {
    const content = "A".repeat(200);
    const snippet = generateContentSnippet(content, "A", 50);

    // Account for ellipsis
    expect(snippet.length).toBeLessThanOrEqual(60);
  });

  it("handles match at the beginning", () => {
    const content = "keyword at the start of the text";
    const snippet = generateContentSnippet(content, "keyword");

    expect(snippet.startsWith("...")).toBe(false);
  });

  it("handles match at the end", () => {
    const content = "text ending with keyword";
    const snippet = generateContentSnippet(content, "keyword");

    expect(snippet.endsWith("...")).toBe(false);
  });

  it("uses first matching token when multiple exist", () => {
    const content = "second appears before first in this text";
    const snippet = generateContentSnippet(content, "first second");

    expect(snippet).toContain("second");
  });

  it("handles null content", () => {
    expect(generateContentSnippet(null as unknown as string, "query")).toBe("");
  });

  it("handles null query", () => {
    expect(generateContentSnippet("content", null as unknown as string)).toBe(
      "",
    );
  });
});

describe("filterResults integration", () => {
  it("handles complex real-world scenario", () => {
    const results: SearchResult[] = [
      {
        id: "tab-1-1",
        title: "GitHub Pull Request #456 - Feature implementation",
        url: "https://github.com/org/repo/pull/456",
        source: "tab",
        windowIndex: 1,
        tabIndex: 1,
      },
      {
        id: "bookmark-1",
        title: "Raycast API Docs",
        url: "https://developers.raycast.com/api-reference",
        source: "bookmark",
      },
      {
        id: "tab-1-2",
        title: "Gmail - Inbox",
        url: "https://mail.google.com/mail/u/0/#inbox",
        source: "tab",
        windowIndex: 1,
        tabIndex: 2,
        content:
          "Important: Please review the pull request for the new authentication feature",
      },
      {
        id: "history-1",
        title: "GitHub Issues",
        url: "https://github.com/org/repo/issues",
        source: "history",
      },
    ];

    // Test word-order-independent search
    const prResults = filterResults(results, "request pull github");
    expect(prResults).toHaveLength(1);
    expect(prResults[0].title).toContain("Pull Request");

    // Test content search
    const contentResults = filterResults(results, "authentication feature");
    expect(contentResults).toHaveLength(1);
    expect(contentResults[0].title).toBe("Gmail - Inbox");
    expect(contentResults[0].isContentMatch).toBe(true);

    // Test multi-word search across domain and title
    const docsResults = filterResults(results, "docs api raycast");
    expect(docsResults).toHaveLength(1);
    expect(docsResults[0].title).toBe("Raycast API Docs");
  });
});
