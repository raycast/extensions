import { describe, it, expect } from "vitest";
import {
  searchViaDDG,
  searchViaBing,
  searchViaStartpage,
  searchDuckDuckGo,
} from "./duckduckgo.js";
import type { SearchResult } from "./types.js";

const TIMEOUT = 20_000;

const HTML_TAG_RE = /<[^>]+>/;
const BLANK_RE = /^\s*$/;

function assertValidResult(r: SearchResult, engine: string) {
  expect(r.title, `[${r.url}] title must not be empty`).not.toMatch(BLANK_RE);
  expect(r.title, `[${r.url}] title must not contain HTML tags`).not.toMatch(
    HTML_TAG_RE,
  );
  expect(r.url, `title="${r.title}" url must start with http`).toMatch(
    /^https?:\/\//,
  );
  expect(
    r.snippet,
    `[${r.url}] snippet must not contain HTML tags`,
  ).not.toMatch(HTML_TAG_RE);
  expect(r.engine, `[${r.url}] engine label must match`).toBe(engine);
}

function assertNoDuplicateHostnames(results: SearchResult[]) {
  const hostnames = results.map((r) => {
    try {
      return new URL(r.url).hostname.replace(/^www\./, "");
    } catch {
      return r.url;
    }
  });
  const dupes = hostnames.filter((h, i) => hostnames.indexOf(h) !== i);
  expect(dupes, `duplicate hostnames: ${dupes.join(", ")}`).toHaveLength(0);
}

function hasRelevantResult(
  results: SearchResult[],
  keywords: string[],
): boolean {
  return results.some((r) => {
    const haystack = `${r.title} ${r.url} ${r.snippet}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
  });
}

describe("Startpage engine (raw)", () => {
  it(
    "returns well-formed results for 'opencode'",
    async () => {
      const results = await searchViaStartpage("opencode", 20);
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Startpage"));
      expect(
        hasRelevantResult(results, ["opencode"]),
        "relevant to opencode",
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "returns well-formed results for 'hasura graphql' (skips if geo-misrouted)",
    async () => {
      const results = await searchViaStartpage("hasura graphql", 20);
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Startpage"));
      expect(
        hasRelevantResult(results, ["hasura", "graphql"]),
        "relevant to hasura graphql",
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "returns well-formed results for 'raycast extension api' (skips if geo-misrouted)",
    async () => {
      const results = await searchViaStartpage("raycast extension api", 20);
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Startpage"));
      expect(
        hasRelevantResult(results, ["raycast"]),
        "relevant to raycast",
      ).toBe(true);
    },
    TIMEOUT,
  );
});

describe("DuckDuckGo engine (raw)", () => {
  it(
    "returns well-formed results for 'opencode' (skips if network-blocked)",
    async () => {
      let results: SearchResult[];
      try {
        results = await searchViaDDG("opencode", 20);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("blocked") || msg.includes("0 result nodes")) {
          console.warn("DDG blocked on this network — skipping:", msg);
          return;
        }
        throw err;
      }
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "DuckDuckGo"));
      expect(
        hasRelevantResult(results, ["opencode"]),
        "relevant to opencode",
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "returns well-formed results for 'hasura graphql' (skips if network-blocked)",
    async () => {
      let results: SearchResult[];
      try {
        results = await searchViaDDG("hasura graphql", 20);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("blocked") || msg.includes("0 result nodes")) {
          console.warn("DDG blocked on this network — skipping:", msg);
          return;
        }
        throw err;
      }
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "DuckDuckGo"));
      expect(
        hasRelevantResult(results, ["hasura", "graphql"]),
        "relevant to hasura graphql",
      ).toBe(true);
    },
    TIMEOUT,
  );
});

describe("Bing engine (raw)", () => {
  async function bingOrSkip(query: string): Promise<SearchResult[] | null> {
    try {
      return await searchViaBing(query, 20);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("geo-misrouted") || msg.includes("0 result nodes")) {
        console.warn("Bing geo-misrouted on this network — skipping:", msg);
        return null;
      }
      throw err;
    }
  }

  it(
    "returns well-formed results for 'opencode'",
    async () => {
      const results = await bingOrSkip("opencode");
      if (!results) return;
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Bing"));
      expect(
        hasRelevantResult(results, ["opencode"]),
        "relevant to opencode",
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "returns well-formed results for 'hasura graphql'",
    async () => {
      const results = await bingOrSkip("hasura graphql");
      if (!results) return;
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Bing"));
      expect(
        hasRelevantResult(results, ["hasura", "graphql"]),
        "relevant to hasura graphql",
      ).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "returns well-formed results for 'raycast extension api'",
    async () => {
      const results = await bingOrSkip("raycast extension api");
      if (!results) return;
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => assertValidResult(r, "Bing"));
      expect(
        hasRelevantResult(results, ["raycast"]),
        "relevant to raycast",
      ).toBe(true);
    },
    TIMEOUT,
  );
});

describe("searchDuckDuckGo (merged + deduplicated)", () => {
  it(
    "returns up to 10 deduplicated results for 'opencode'",
    async () => {
      const results = await searchDuckDuckGo("opencode");
      expect(results.length).toBeGreaterThanOrEqual(5);
      expect(results.length).toBeLessThanOrEqual(10);
      results.forEach((r) => {
        expect(r.title).not.toMatch(BLANK_RE);
        expect(r.title).not.toMatch(HTML_TAG_RE);
        expect(r.url).toMatch(/^https?:\/\//);
        expect(r.snippet).not.toMatch(HTML_TAG_RE);
        expect(["Startpage", "DuckDuckGo", "Bing"]).toContain(r.engine);
      });
      assertNoDuplicateHostnames(results);
      expect(
        hasRelevantResult(results, ["opencode"]),
        "relevant to opencode",
      ).toBe(true);
    },
    TIMEOUT * 3,
  );

  it(
    "returns ≥5 results for 'hasura' (exercises fallback merging)",
    async () => {
      const results = await searchDuckDuckGo("hasura");
      expect(results.length).toBeGreaterThanOrEqual(5);
      results.forEach((r) => {
        expect(r.title).not.toMatch(BLANK_RE);
        expect(r.title).not.toMatch(HTML_TAG_RE);
        expect(r.url).toMatch(/^https?:\/\//);
        expect(r.snippet).not.toMatch(HTML_TAG_RE);
      });
      assertNoDuplicateHostnames(results);
      expect(hasRelevantResult(results, ["hasura"]), "relevant to hasura").toBe(
        true,
      );
    },
    TIMEOUT * 3,
  );

  it(
    "returns deduplicated results for 'typescript zod schema validation'",
    async () => {
      const results = await searchDuckDuckGo(
        "typescript zod schema validation",
      );
      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((r) => {
        expect(r.title).not.toMatch(BLANK_RE);
        expect(r.title).not.toMatch(HTML_TAG_RE);
        expect(r.url).toMatch(/^https?:\/\//);
      });
      assertNoDuplicateHostnames(results);
      expect(
        hasRelevantResult(results, ["zod", "typescript", "schema"]),
        "relevant to zod/typescript",
      ).toBe(true);
    },
    TIMEOUT * 3,
  );
});
