import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ExitCode, explain, isAbort, parseHits, wasAlreadyCaptured } from "../src/contract";
import { Capture, Hit, headline, tagList } from "../src/types";

/**
 * The golden fixtures the Swift CLI tests assert against, read from the capd repository
 * so that changing the CLI's JSON contract fails this suite too. They are absent when the
 * extension is published on its own, which is why these cases skip rather than fail.
 */
const FIXTURES = join(__dirname, "../../Tests/CapdCLITests/Fixtures");
const hasFixtures = existsSync(FIXTURES);

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as T;
}

describe.skipIf(!hasFixtures)("the search --json contract", () => {
  it("parses the golden fixture into the shape the UI reads", () => {
    const hits = fixture<Hit[]>("search.json");
    expect(hits).toHaveLength(1);

    const [hit] = hits;
    expect(hit.capture.id).toBe(3);
    expect(hit.capture.kind).toBe("link");
    expect(hit.capture.url).toBe("https://example.com/reading?id=42");
    expect(hit.capture.host).toBe("example.com");
    expect(hit.capture.seen_count).toBe(2);
    expect(hit.snippet).toBe("Structured Concurrency Notes");
  });

  it("keeps created_at parseable as a date", () => {
    const created = new Date(fixture<Hit[]>("search.json")[0].capture.created_at);
    expect(Number.isNaN(created.getTime())).toBe(false);
    expect(created.toISOString()).toBe("2026-03-03T00:00:00.500Z");
  });

  it("omits unset fields rather than encoding null", () => {
    const [hit] = fixture<Hit[]>("search.json");
    expect("tags" in hit.capture).toBe(false);
    expect("asset_path" in hit.capture).toBe(false);
  });
});

describe.skipIf(!hasFixtures)("the list --json contract", () => {
  it("parses every capture in the golden fixture", () => {
    const hits = fixture<Hit[]>("list.json");
    expect(hits.length).toBeGreaterThan(0);

    for (const hit of hits) {
      expect(typeof hit.capture.id).toBe("number");
      expect(["link", "text", "image"]).toContain(hit.capture.kind);
      expect(headline(hit.capture)).not.toBe("");
    }
  });
});

describe("headline", () => {
  const base: Capture = {
    id: 1,
    kind: "link",
    tags_version: 0,
    enrichment_state: "ok",
    body_status: "none",
    attempt_count: 0,
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    last_seen_at: "2026-03-01T00:00:00.000Z",
    seen_count: 1,
  };

  it("prefers the title", () => {
    expect(headline({ ...base, title: "A Title", url: "https://example.com" })).toBe("A Title");
  });

  it("falls back to the url when there is no title", () => {
    expect(headline({ ...base, url: "https://example.com" })).toBe("https://example.com");
  });

  it("falls back to the selection for text captures", () => {
    expect(headline({ ...base, kind: "text", selection: "actors isolate state" })).toBe("actors isolate state");
  });

  it("never renders an empty row", () => {
    expect(headline({ ...base, kind: "image" })).toBe("Capture #1");
  });

  it("ignores a whitespace-only title", () => {
    expect(headline({ ...base, title: "   ", url: "https://example.com" })).toBe("https://example.com");
  });
});

describe("tagList", () => {
  it("splits the space-joined column", () => {
    expect(tagList({ tags: "swift concurrency" } as Capture)).toEqual(["swift", "concurrency"]);
  });

  it("is empty when tagging has not run", () => {
    expect(tagList({} as Capture)).toEqual([]);
  });
});

describe("exit codes", () => {
  it("matches the codes the CLI documents", () => {
    expect(ExitCode).toEqual({
      ok: 0,
      noResults: 1,
      badUsage: 2,
      storeUnavailable: 3,
      agentNotRunning: 4,
    });
  });

  it("prefers the reason capd printed", () => {
    const stderr = "The capture store is unavailable: no such file";
    expect(explain({ stderr, code: ExitCode.storeUnavailable })).toBe(stderr);
  });

  it("explains a silent failure", () => {
    expect(explain({ stderr: "", code: ExitCode.agentNotRunning })).toBe("The Capd enrichment agent is not running.");
    expect(explain({ stderr: "  \n", code: ExitCode.badUsage })).toBe("Capd could not understand that request.");
    expect(explain({ stderr: "", code: 99 })).toBe("capd exited with code 99.");
  });
});

describe("abort detection", () => {
  it("recognizes both shapes Node uses", () => {
    expect(isAbort({ name: "AbortError" })).toBe(true);
    expect(isAbort({ code: "ABORT_ERR" })).toBe(true);
    expect(isAbort({ code: 1 })).toBe(false);
    expect(isAbort(null)).toBe(false);
  });
});

describe("add output", () => {
  it("recognizes a re-capture", () => {
    expect(wasAlreadyCaptured("Already captured #3 (2026-03-03): Notes — https://example.com")).toBe(true);
    expect(wasAlreadyCaptured("Captured #4: Notes — https://example.com")).toBe(false);
  });
});

describe("parseHits", () => {
  it("returns an empty list when stdout is blank", () => {
    expect(parseHits("")).toEqual([]);
    expect(parseHits("  \n")).toEqual([]);
  });

  it("parses a JSON array", () => {
    const hits = parseHits('[{"capture":{"id":3},"snippet":"Notes"}]');
    expect(hits).toHaveLength(1);
    expect(hits[0].capture.id).toBe(3);
  });

  it("rejects a non-array payload", () => {
    expect(() => parseHits('{"capture":{"id":3}}')).toThrow("Capd search did not return a JSON array.");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseHits("not json")).toThrow("Capd search returned invalid JSON.");
  });
});
