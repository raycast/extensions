import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PROGRESS_SCHEMA_VERSION, type NewBook, type ReadingProgress } from "../domain/book";
import { LibraryStore } from "./library-store";

const draft: NewBook = {
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en",
  categories: [],
  license: null,
  visibility: "private",
  source: { kind: "import", format: "md", fileName: "walden.md" },
  chapters: [{ title: "Economy", markdown: "When I wrote the following pages." }],
};

const progress: ReadingProgress = {
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  position: { chapterIndex: 0, blockIndex: 0 },
  percent: 0,
  bookmarks: [],
  updatedAt: "2026-09-15T00:00:00.000Z",
};

let dir: string;
let root: string;
let store: LibraryStore;

async function withMode<T>(path: string, mode: number, run: () => Promise<T>): Promise<T> {
  await chmod(path, mode);
  try {
    return await run();
  } finally {
    await chmod(path, 0o755);
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ebook-hub-failures-"));
  root = join(dir, "library");
  store = new LibraryStore(root);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("LibraryStore failures", () => {
  it("reports a library path that is not a folder", async () => {
    await writeFile(root, "not a folder");
    await expect(store.list()).rejects.toMatchObject({ code: "io", message: "Could not read the library folder" });
  });

  it("cannot create books in a read-only library", async () => {
    await mkdir(root);
    await withMode(root, 0o555, async () => {
      await expect(store.create(draft)).rejects.toMatchObject({ code: "io", message: "Could not save the book" });
    });
    expect(await readdir(root)).toEqual([]);
  });

  it("skips stray files and folders when listing", async () => {
    await store.create(draft);
    await writeFile(join(root, "notes.txt"), "x");
    await mkdir(join(root, "not-a-book"));
    expect((await store.list()).books).toHaveLength(1);
  });

  it("rejects manifests that belong to another book or break the schema", async () => {
    const book = await store.create(draft);
    const other = await store.create(draft);
    const manifestPath = join(store.bookPath(book.id), "manifest.json");

    await writeFile(manifestPath, JSON.stringify(other), "utf8");
    await expect(store.get(book.id)).rejects.toMatchObject({
      code: "invalid",
      message: `Book ${book.id} has a manifest for ${other.id}`,
    });

    await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1 }), "utf8");
    await expect(store.get(book.id)).rejects.toMatchObject({ code: "invalid" });
  });

  it("reports unreadable manifests and chapters", async () => {
    const book = await store.create(draft);
    await expect(store.readChapter(book, 5)).rejects.toMatchObject({
      code: "not_found",
      message: "Chapter 6 does not exist",
    });

    const chapterPath = join(store.bookPath(book.id), "chapters", "0001.md");
    await rm(chapterPath);
    await expect(store.readChapter(book, 0)).rejects.toMatchObject({ code: "not_found" });
    await mkdir(chapterPath);
    await expect(store.readChapter(book, 0)).rejects.toMatchObject({ code: "io" });

    const manifestPath = join(store.bookPath(book.id), "manifest.json");
    await rm(manifestPath);
    await mkdir(manifestPath);
    await expect(store.get(book.id)).rejects.toMatchObject({ code: "io" });
  });

  it("reports invalid or unwritable progress and cleans up temp files", async () => {
    const book = await store.create(draft);
    const progressPath = join(store.bookPath(book.id), "progress.json");

    await writeFile(progressPath, '{"schemaVersion":1}', "utf8");
    await expect(store.readProgress(book.id)).rejects.toMatchObject({
      code: "invalid",
      message: expect.stringMatching(/^Saved progress is invalid/),
    });

    await writeFile(progressPath, "{", "utf8");
    await expect(store.readProgress(book.id)).rejects.toMatchObject({ code: "invalid" });

    await rm(progressPath);
    await mkdir(join(progressPath, "nested"), { recursive: true });
    await expect(store.writeProgress(book.id, progress)).rejects.toMatchObject({
      code: "io",
      message: "Could not save reading progress",
    });
    expect((await readdir(store.bookPath(book.id))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("reports failures to update or delete books", async () => {
    const book = await store.create(draft);

    await withMode(store.bookPath(book.id), 0o555, async () => {
      await expect(store.updateMetadata(book.id, draft)).rejects.toMatchObject({
        code: "io",
        message: 'Could not update "Walden"',
      });
    });

    await withMode(root, 0o555, async () => {
      await expect(store.delete(book.id)).rejects.toMatchObject({ code: "io" });
    });

    await store.delete(book.id);
    await expect(store.delete(book.id)).rejects.toMatchObject({ code: "not_found" });
  });
});
