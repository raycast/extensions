import { describe, expect, test } from "bun:test";
import { parseSearchQuery, matchesSearch } from "../search";
import type { EnhancedProject } from "../types";

describe("parseSearchQuery", () => {
  test("parses plain text", () => {
    const result = parseSearchQuery("my project");
    expect(result.text).toBe("my project");
    expect(result.filters).toEqual({});
  });

  test("parses collection filter", () => {
    const result = parseSearchQuery("#work");
    expect(result.text).toBe("");
    expect(result.filters.collection).toBe("work");
  });

  test("parses language filter", () => {
    const result = parseSearchQuery("lang:typescript");
    expect(result.filters.lang).toBe("typescript");
  });

  test("parses org filter", () => {
    const result = parseSearchQuery("org:acme");
    expect(result.filters.org).toBe("acme");
  });

  test("parses in: path filter", () => {
    const result = parseSearchQuery("in:~/work");
    expect(result.filters.inPath).toBe("~/work");
  });

  test("parses special collection filters", () => {
    expect(parseSearchQuery("#recent").filters.collection).toBe("_recent");
    expect(parseSearchQuery("#stale").filters.collection).toBe("_stale");
  });

  test("parses combined filters and text", () => {
    const result = parseSearchQuery("#work lang:typescript api");
    expect(result.text).toBe("api");
    expect(result.filters.collection).toBe("work");
    expect(result.filters.lang).toBe("typescript");
  });
});

describe("matchesSearch", () => {
  const baseProject: EnhancedProject = {
    name: "my-api",
    path: "/Users/me/work/my-api",
    relativePath: "my-api",
    collections: ["work"],
    lastOpened: Date.now(),
    detectedLang: "typescript",
    gitOrg: "acme-corp",
  };

  test("matches text in project name", () => {
    const query = parseSearchQuery("api");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("does not match non-matching text", () => {
    const query = parseSearchQuery("frontend");
    expect(matchesSearch(baseProject, query)).toBe(false);
  });

  test("matches collection filter", () => {
    const query = parseSearchQuery("#work");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("does not match wrong collection", () => {
    const query = parseSearchQuery("#personal");
    expect(matchesSearch(baseProject, query)).toBe(false);
  });

  test("matches language filter", () => {
    const query = parseSearchQuery("lang:typescript");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("matches org filter", () => {
    const query = parseSearchQuery("org:acme");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("matches path filter", () => {
    const query = parseSearchQuery("in:/Users/me/work");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("matches combined filters", () => {
    const query = parseSearchQuery("#work lang:typescript api");
    expect(matchesSearch(baseProject, query)).toBe(true);
  });

  test("fails if any filter does not match", () => {
    const query = parseSearchQuery("#personal lang:typescript");
    expect(matchesSearch(baseProject, query)).toBe(false);
  });
});
