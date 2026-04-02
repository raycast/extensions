import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getProjectLabel, extractSnippet, collectMessage, streamJsonl, MAX_PREVIEW_TURNS } from "./utils";
import type { MessageCollector } from "./utils";

// ---------------------------------------------------------------------------
// getProjectLabel
// ---------------------------------------------------------------------------

describe("getProjectLabel", () => {
  it("returns last 2 segments for a Unix path", () => {
    expect(getProjectLabel("/home/user/projects/myapp")).toBe("projects/myapp");
  });

  it("returns last 2 segments for a Windows path", () => {
    expect(getProjectLabel("C:\\Users\\user\\projects\\myapp")).toBe("projects/myapp");
  });

  it("returns single segment for a short path", () => {
    expect(getProjectLabel("/myapp")).toBe("myapp");
  });

  it("handles trailing slash", () => {
    expect(getProjectLabel("/home/user/projects/myapp/")).toBe("projects/myapp");
  });

  it("returns empty string for empty input", () => {
    expect(getProjectLabel("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// extractSnippet
// ---------------------------------------------------------------------------

describe("extractSnippet", () => {
  const longText = "A".repeat(500) + "NEEDLE" + "B".repeat(500);

  it("extracts window around query match with ellipses", () => {
    const snippet = extractSnippet(longText, "NEEDLE", 100);
    expect(snippet).toContain("NEEDLE");
    expect(snippet.startsWith("...")).toBe(true);
    expect(snippet.endsWith("...")).toBe(true);
  });

  it("returns first windowSize*2 chars when query not found", () => {
    const snippet = extractSnippet(longText, "MISSING", 50);
    expect(snippet.length).toBe(100);
  });

  it("no leading ellipsis when match is at start", () => {
    const snippet = extractSnippet("NEEDLE rest of text", "NEEDLE");
    expect(snippet.startsWith("...")).toBe(false);
    expect(snippet).toContain("NEEDLE");
  });

  it("no trailing ellipsis when match is at end", () => {
    const snippet = extractSnippet("some text NEEDLE", "NEEDLE");
    expect(snippet.endsWith("...")).toBe(false);
  });

  it("matches case-insensitively", () => {
    const snippet = extractSnippet("This has an ERROR in it", "error");
    expect(snippet).toContain("ERROR");
  });

  it("replaces newlines with spaces", () => {
    const snippet = extractSnippet("line1\nNEEDLE\nline3", "NEEDLE");
    expect(snippet).not.toContain("\n");
    expect(snippet).toContain("NEEDLE");
  });
});

// ---------------------------------------------------------------------------
// collectMessage
// ---------------------------------------------------------------------------

describe("collectMessage", () => {
  function freshCollector(): MessageCollector {
    return { firstUserPrompt: null, matchCount: 0, matches: [], preview: [] };
  }

  it("sets firstUserPrompt from first user message", () => {
    const c = freshCollector();
    collectMessage(c, "Hello world", "user", null, null, null);
    expect(c.firstUserPrompt).toBe("Hello world");
  });

  it("truncates firstUserPrompt to 200 chars", () => {
    const c = freshCollector();
    collectMessage(c, "X".repeat(300), "user", null, null, null);
    expect(c.firstUserPrompt!.length).toBe(200);
  });

  it("does not overwrite firstUserPrompt with second user message", () => {
    const c = freshCollector();
    collectMessage(c, "First", "user", null, null, null);
    collectMessage(c, "Second", "user", null, null, null);
    expect(c.firstUserPrompt).toBe("First");
  });

  it("does not set firstUserPrompt from assistant message", () => {
    const c = freshCollector();
    collectMessage(c, "I am assistant", "assistant", null, null, null);
    expect(c.firstUserPrompt).toBeNull();
  });

  it("maintains preview ring buffer at MAX_PREVIEW_TURNS", () => {
    const c = freshCollector();
    for (let i = 0; i < MAX_PREVIEW_TURNS + 2; i++) {
      collectMessage(c, `Message ${i}`, "user", null, null, null);
    }
    expect(c.preview.length).toBe(MAX_PREVIEW_TURNS);
    expect(c.preview[0].text).toBe("Message 2");
    expect(c.preview[MAX_PREVIEW_TURNS - 1].text).toBe(`Message ${MAX_PREVIEW_TURNS + 1}`);
  });

  it("truncates preview content to 1000 chars", () => {
    const c = freshCollector();
    collectMessage(c, "Y".repeat(2000), "user", null, null, null);
    expect(c.preview[0].text.length).toBe(1000);
  });

  it("increments matchCount and adds to matches when query matches", () => {
    const c = freshCollector();
    collectMessage(c, "This has the keyword inside", "user", null, "keyword", "keyword");
    expect(c.matchCount).toBe(1);
    expect(c.matches.length).toBe(1);
    expect(c.matches[0].source).toBe("user");
  });

  it("does not match when content does not contain query", () => {
    const c = freshCollector();
    collectMessage(c, "Nothing relevant here", "user", null, "keyword", "keyword");
    expect(c.matchCount).toBe(0);
    expect(c.matches.length).toBe(0);
  });

  it("populates preview even with null query", () => {
    const c = freshCollector();
    collectMessage(c, "Some content", "user", "2025-01-15T10:00:00Z", null, null);
    expect(c.preview.length).toBe(1);
    expect(c.preview[0].timestamp).toBe("2025-01-15T10:00:00Z");
    expect(c.matchCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// streamJsonl
// ---------------------------------------------------------------------------

describe("streamJsonl", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "resesh-test-"));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("calls onRecord for each valid JSON line", async () => {
    const file = join(tmpDir, "valid.jsonl");
    writeFileSync(file, '{"a":1}\n{"b":2}\n{"c":3}\n');
    const records: Record<string, unknown>[] = [];
    await streamJsonl(file, (rec) => records.push(rec));
    expect(records).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("skips malformed JSON lines", async () => {
    const file = join(tmpDir, "malformed.jsonl");
    writeFileSync(file, '{"a":1}\nNOT JSON\n{"b":2}\n');
    const records: Record<string, unknown>[] = [];
    await streamJsonl(file, (rec) => records.push(rec));
    expect(records).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("supports early close", async () => {
    const file = join(tmpDir, "earlyclose.jsonl");
    writeFileSync(file, '{"a":1}\n{"b":2}\n{"c":3}\n{"d":4}\n');
    const records: Record<string, unknown>[] = [];
    await streamJsonl(file, (rec, close) => {
      records.push(rec);
      if (records.length === 2) close();
    });
    expect(records.length).toBe(2);
  });

  it("resolves without calling onRecord for empty file", async () => {
    const file = join(tmpDir, "empty.jsonl");
    writeFileSync(file, "");
    const records: Record<string, unknown>[] = [];
    await streamJsonl(file, (rec) => records.push(rec));
    expect(records).toEqual([]);
  });

  it("handles non-existent file gracefully", async () => {
    const records: Record<string, unknown>[] = [];
    try {
      await streamJsonl(join(tmpDir, "nonexistent.jsonl"), (rec) => records.push(rec));
    } catch {
      // ENOENT may reject depending on error event ordering — both outcomes are acceptable
    }
    expect(records).toEqual([]);
  });
});
