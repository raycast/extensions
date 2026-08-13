import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { searchNotesWithContent } from "../api/search/simple-content-search.service";
import fs from "fs";
import path from "path";
import os from "os";
import { Note } from "@/obsidian";

function noteFor(tempDir: string, fileName: string, title: string): Note {
  return {
    title,
    path: path.join(tempDir, fileName),
    lastModified: new Date(),
    bookmarked: false,
  };
}

describe("content search large files", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-search-large-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("skips oversized markdown during content search and still matches small files", async () => {
    const smallPath = path.join(tempDir, "small.md");
    const largePath = path.join(tempDir, "large.md");

    fs.writeFileSync(smallPath, "this small note mentions uniquetoken123");
    // Just over the 1 MiB full-read limit. Put the token at the end so a
    // naive full slurp would have found it — we must skip instead of OOM.
    const largeBody = `${"x".repeat(1024 * 1024 + 64)}uniquetoken123`;
    fs.writeFileSync(largePath, largeBody);

    const notes = [noteFor(tempDir, "small.md", "Small"), noteFor(tempDir, "large.md", "Large")];
    const results = await searchNotesWithContent(notes, "uniquetoken123");

    expect(results.some((n) => n.title === "Small")).toBe(true);
    expect(results.some((n) => n.title === "Large")).toBe(false);
  });

  it("does not throw when a missing file sits next to an oversized file", async () => {
    const largePath = path.join(tempDir, "large.md");
    fs.writeFileSync(largePath, `${"y".repeat(1024 * 1024 + 64)}missing-neighbor`);

    const notes = [
      noteFor(tempDir, "large.md", "Large"),
      {
        title: "Missing",
        path: path.join(tempDir, "does-not-exist.md"),
        lastModified: new Date(),
        bookmarked: false,
      },
    ];

    const results = await searchNotesWithContent(notes, "missing-neighbor");
    expect(results).toEqual([]);
  });

  it("still finds YAML tags in the prefix of an oversized file", async () => {
    const largePath = path.join(tempDir, "tagged-large.md");
    fs.writeFileSync(largePath, `---\ntags:\n  - hugeclip\n---\n${"z".repeat(1024 * 1024 + 64)}`);

    const notes = [noteFor(tempDir, "tagged-large.md", "Tagged Large")];
    const results = await searchNotesWithContent(notes, "tag:hugeclip");

    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Tagged Large");
  });

  it("does not require reading an oversized file to match its title", async () => {
    const largePath = path.join(tempDir, "raycast-hotkeys.md");
    fs.writeFileSync(largePath, "x".repeat(1024 * 1024 + 64));

    const notes = [noteFor(tempDir, "raycast-hotkeys.md", "Raycast Hotkeys")];
    const results = await searchNotesWithContent(notes, "Raycast Hotkeys");

    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Raycast Hotkeys");
  });
});
