import { mkdtemp, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS, detectFormat, importFile } from ".";
import { ImportError } from "./types";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ebook-hub-import-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("detectFormat", () => {
  it.each([
    ["book.md", "md"],
    ["book.MARKDOWN", "md"],
    ["notes.txt", "txt"],
    ["novel.epub", "epub"],
    ["paper.PDF", "pdf"],
    ["archive.mobi", null],
    ["README", null],
  ])("%s → %s", (path, expected) => {
    expect(detectFormat(path)).toBe(expected);
  });

  it("lists supported extensions", () => {
    expect(SUPPORTED_EXTENSIONS).toEqual([".md", ".markdown", ".txt", ".epub", ".pdf"]);
  });
});

describe("importFile", () => {
  it("imports a Markdown file using the file name as fallback title", async () => {
    const path = join(dir, "my-notes.md");
    await writeFile(path, "Just one paragraph.", "utf8");

    const result = await importFile(path);

    expect(result.format).toBe("md");
    expect(result.fileName).toBe("my-notes.md");
    expect(result.book.title).toBe("my-notes");
  });

  it("dispatches plain text files to the text importer", async () => {
    const path = join(dir, "story.txt");
    await writeFile(path, "# literal hash", "utf8");
    expect((await importFile(path)).book.chapters[0].markdown).toBe("\\# literal hash");
  });

  it("rejects unsupported types, folders, missing files, and oversized files", async () => {
    await expect(importFile(join(dir, "book.mobi"))).rejects.toThrow(/Unsupported file type/);

    const folder = join(dir, "folder.md");
    await (await import("node:fs/promises")).mkdir(folder);
    await expect(importFile(folder)).rejects.toThrow(/not a folder/);

    await expect(importFile(join(dir, "missing.md"))).rejects.toBeInstanceOf(ImportError);

    const huge = join(dir, "huge.pdf");
    await writeFile(huge, "");
    await truncate(huge, MAX_IMPORT_BYTES + 1);
    await expect(importFile(huge)).rejects.toThrow(/larger than 100 MB/);
  });
});
