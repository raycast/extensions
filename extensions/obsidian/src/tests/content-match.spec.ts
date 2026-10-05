import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  findContentMatches,
  MAX_CONTEXT_LINE_LENGTH,
  queryWithoutTagFilter,
  searchNotesWithMatches,
} from "../api/search/content-match.service";
import {
  MAX_CONTENT_SEARCH_RESULTS,
  MAX_SEARCH_FILE_SIZE_BYTES,
  readSearchableNoteContent,
} from "../api/search/simple-content-search.service";
import { Note } from "@/obsidian";

describe("content matches", () => {
  it("returns 1-based line and column positions with context", () => {
    const content = "first line\nA target is here\nlast line";
    const [match] = findContentMatches(content, "target", 1);

    expect(match.line).toBe(2);
    expect(match.column).toBe(3);
    expect(match.endLine).toBe(2);
    expect(match.endColumn).toBe(9);
    expect(match.context).toEqual([
      { line: 1, text: "first line", startColumn: 1 },
      { line: 2, text: "A target is here", startColumn: 1 },
      { line: 3, text: "last line", startColumn: 1 },
    ]);
  });

  it("finds multiple occurrences case-insensitively", () => {
    const matches = findContentMatches("Target\nother target", "TARGET");

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => [match.line, match.column])).toEqual([
      [1, 1],
      [2, 7],
    ]);
  });

  it("keeps offsets tied to the original text when an earlier character expands during lowercasing", () => {
    const matches = findContentMatches("İ target target", "TARGET");

    expect(matches.map((match) => [match.column, match.endColumn])).toEqual([
      [3, 9],
      [10, 16],
    ]);
  });

  it("selects the original characters when the query changes length during lowercasing", () => {
    const matches = findContentMatches("AİB İ", "İ");

    expect(matches.map((match) => [match.column, match.endColumn])).toEqual([
      [2, 3],
      [5, 6],
    ]);
  });

  it("bounds long context lines without losing a distant match", () => {
    const longAdjacentLine = "a".repeat(MAX_CONTEXT_LINE_LENGTH * 3);
    const longMatchingLine = `${"b".repeat(MAX_CONTEXT_LINE_LENGTH * 2)}target`;

    const [match] = findContentMatches(`heading target\n${longAdjacentLine}\n${longMatchingLine}`, "target", 2, 2);
    const adjacentContext = match.context.find((line) => line.line === 2);
    const distantMatch = findContentMatches(longMatchingLine, "target")[0];
    const matchingContext = distantMatch.context[0];

    expect(adjacentContext?.text).toHaveLength(MAX_CONTEXT_LINE_LENGTH);
    expect(matchingContext.text).toHaveLength(MAX_CONTEXT_LINE_LENGTH);
    expect(matchingContext.text).toContain("target");
    expect(matchingContext.startColumn).toBeGreaterThan(1);
    expect(distantMatch.column).toBe(MAX_CONTEXT_LINE_LENGTH * 2 + 1);
  });

  it("removes tag filters from the content query", () => {
    expect(queryWithoutTagFilter("tag:work target phrase")).toBe("target phrase");
    expect(queryWithoutTagFilter("tag:work")).toBe("");
  });
});

describe("searchNotesWithMatches", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-match-search-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates a separate result for every content occurrence", async () => {
    const notePath = path.join(tempDir, "example.md");
    fs.writeFileSync(notePath, "target one\nno match\ntarget two");
    const notes: Note[] = [
      {
        title: "Example",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithMatches(notes, "target");

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.match?.line)).toEqual([1, 3]);
    expect(new Set(results.map((result) => result.id)).size).toBe(2);
  });

  it("discards fuzzy-only title matches such as sqlite for split", async () => {
    const sqlitePath = path.join(tempDir, "sqlite.md");
    const linuxPath = path.join(tempDir, "linux.md");
    fs.writeFileSync(sqlitePath, "Database notes without the requested word");
    fs.writeFileSync(linuxPath, "Use split to divide a large file");
    const notes: Note[] = [
      {
        title: "sqlite",
        path: sqlitePath,
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "Linux",
        path: linuxPath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithMatches(notes, "split");

    expect(results.map((result) => result.note.title)).toEqual(["Linux"]);
    expect(results[0].match?.line).toBe(1);
  });

  it("discards fuzzy-only title matches when note content cannot be read", async () => {
    const notePath = path.join(tempDir, "missing-sqlite.md");
    const notes: Note[] = [
      {
        title: "sqlite",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithMatches(notes, "split");

    expect(results).toEqual([]);
  });

  it("keeps literal title matches after content occurrences", async () => {
    const titlePath = path.join(tempDir, "split-reference.md");
    const contentPath = path.join(tempDir, "linux.md");
    fs.writeFileSync(titlePath, "No occurrence in the body");
    fs.writeFileSync(contentPath, "The split command divides files");
    const notes: Note[] = [
      {
        title: "Split Reference",
        path: titlePath,
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "Linux",
        path: contentPath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithMatches(notes, "split");

    expect(results.map((result) => result.note.title)).toEqual(["Linux", "Split Reference"]);
    expect(results[0].match).toBeDefined();
    expect(results[1].match).toBeUndefined();
  });

  it("keeps notes that match only by directory path", async () => {
    const matchingDirectory = path.join(tempDir, "path-target");
    fs.mkdirSync(matchingDirectory);
    const notePath = path.join(matchingDirectory, "unrelated.md");
    fs.writeFileSync(notePath, "No occurrence in the body");
    const notes: Note[] = [
      {
        title: "Unrelated",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithMatches(notes, "path-target");

    expect(results).toEqual([{ id: notePath, note: notes[0] }]);
  });

  it("reads each matching note at most once", async () => {
    const titlePath = path.join(tempDir, "target-title.md");
    const contentPath = path.join(tempDir, "content-only.md");
    fs.writeFileSync(titlePath, "No occurrence in this note");
    fs.writeFileSync(contentPath, "The target occurs in this note");
    const notes: Note[] = [
      {
        title: "Target Title",
        path: titlePath,
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "Other Note",
        path: contentPath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];
    const open = vi.spyOn(fs.promises, "open");

    const results = await searchNotesWithMatches(notes, "target");

    expect(results).toHaveLength(2);
    expect(open.mock.calls.filter(([file]) => file === titlePath)).toHaveLength(1);
    expect(open.mock.calls.filter(([file]) => file === contentPath)).toHaveLength(1);
  });

  it("limits title candidates before reading note content", async () => {
    const notes: Note[] = Array.from({ length: MAX_CONTENT_SEARCH_RESULTS + 1 }, (_, index) => {
      const notePath = path.join(tempDir, `target-${index}.md`);
      fs.writeFileSync(notePath, "No occurrence in the body");
      return {
        title: `Target ${index}`,
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };
    });
    const open = vi.spyOn(fs.promises, "open");

    const results = await searchNotesWithMatches(notes, "target");

    expect(open).toHaveBeenCalledTimes(MAX_CONTENT_SEARCH_RESULTS);
    expect(results).toHaveLength(MAX_CONTENT_SEARCH_RESULTS);
  });

  it("reads tagged notes once while filtering and matching content", async () => {
    const notePath = path.join(tempDir, "tagged.md");
    fs.writeFileSync(notePath, "#work\nThe target occurs here");
    const notes: Note[] = [
      {
        title: "Tagged Note",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];
    const open = vi.spyOn(fs.promises, "open");

    const results = await searchNotesWithMatches(notes, "tag:work target");

    expect(results).toHaveLength(1);
    expect(results[0].match).toBeDefined();
    expect(open.mock.calls.filter(([file]) => file === notePath)).toHaveLength(1);
  });

  it("skips content reads for oversized files", async () => {
    const notePath = path.join(tempDir, "oversized.md");
    fs.writeFileSync(notePath, `${"x".repeat(MAX_SEARCH_FILE_SIZE_BYTES)}not-in-prefix`);
    const note: Note = {
      title: "Oversized",
      path: notePath,
      lastModified: new Date(),
      bookmarked: false,
    };

    const content = await readSearchableNoteContent(note);

    expect(content).toBeUndefined();
  });

  it("reads content at the exact file-size boundary", async () => {
    const notePath = path.join(tempDir, "at-limit.md");
    fs.writeFileSync(notePath, `target${"x".repeat(MAX_SEARCH_FILE_SIZE_BYTES - "target".length)}`);
    const note: Note = {
      title: "At Limit",
      path: notePath,
      lastModified: new Date(),
      bookmarked: false,
    };

    const content = await readSearchableNoteContent(note);

    expect(Buffer.byteLength(content ?? "", "utf-8")).toBe(MAX_SEARCH_FILE_SIZE_BYTES);
    expect(content?.startsWith("target")).toBe(true);
  });

  it("keeps oversized fuzzy title matches without a content match", async () => {
    const notePath = path.join(tempDir, "large-clipping.md");
    fs.writeFileSync(notePath, `target-inside-limit\n${"x".repeat(MAX_SEARCH_FILE_SIZE_BYTES)}`);
    const notes: Note[] = [
      {
        title: "target-after-limit",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      },
    ];
    const open = vi.spyOn(fs.promises, "open");

    const results = await searchNotesWithMatches(notes, "target-i");

    expect(results).toEqual([{ id: notePath, note: notes[0] }]);
    expect(open.mock.calls.filter(([file]) => file === notePath)).toHaveLength(1);
  });

  it("stops reading notes when the search becomes stale", async () => {
    const notes = ["one", "two", "three"].map((title) => {
      const notePath = path.join(tempDir, `${title}.md`);
      fs.writeFileSync(notePath, "No matching content");
      return {
        title,
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };
    });
    const open = vi.spyOn(fs.promises, "open");
    let cancellationChecks = 0;

    await searchNotesWithMatches(notes, "target", () => cancellationChecks++ >= 1);

    expect(open).toHaveBeenCalledOnce();
  });
});
