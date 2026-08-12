import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { findContentMatches, queryWithoutTagFilter, searchNotesWithMatches } from "../api/search/content-match.service";
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
      { line: 1, text: "first line" },
      { line: 2, text: "A target is here" },
      { line: 3, text: "last line" },
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
});
