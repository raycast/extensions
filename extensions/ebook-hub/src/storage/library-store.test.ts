import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PROGRESS_SCHEMA_VERSION, type NewBook, type ReadingProgress } from "../domain/book";
import { LibraryError, LibraryStore } from "./library-store";

const draft: NewBook = {
  title: " Truyện Kiều ",
  authors: ["Nguyễn Du", " "],
  language: "vi-VN",
  categories: ["Poetry", "poetry"],
  license: "public-domain",
  visibility: "private",
  source: { kind: "import", format: "md", fileName: "kieu.md" },
  chapters: [
    { title: "Hồi 1", markdown: "Trăm năm trong cõi người ta" },
    { title: "Cover", markdown: "![cover](cover.png)" },
  ],
};

let root: string;
let store: LibraryStore;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ebook-hub-"));
  store = new LibraryStore(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("LibraryStore", () => {
  it("returns an empty listing before the library folder exists", async () => {
    await expect(new LibraryStore(join(root, "missing")).list()).resolves.toEqual({ books: [], unreadable: [] });
  });

  it("creates a normalized book and drops chapters without text", async () => {
    const book = await store.create(draft);

    expect(book).toMatchObject({
      title: "Truyện Kiều",
      authors: ["Nguyễn Du"],
      language: "vi",
      categories: ["poetry"],
      totalWords: 6,
    });
    expect(book.chapters).toEqual([{ title: "Hồi 1", file: "0001.md", words: 6 }]);
    expect(await store.readChapter(book, 0)).toContain("Trăm năm");
    expect((await store.list()).books.map((item) => item.id)).toEqual([book.id]);
    expect((await readdir(root)).filter((name) => name.startsWith("."))).toEqual([]);
  });

  it("refuses a book without readable text", async () => {
    await expect(store.create({ ...draft, chapters: [draft.chapters[1]] })).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("round-trips reading progress", async () => {
    const book = await store.create(draft);
    expect(await store.readProgress(book.id)).toBeNull();

    const progress: ReadingProgress = {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      position: { chapterIndex: 0, blockIndex: 3 },
      percent: 42,
      bookmarks: [{ chapterIndex: 0, blockIndex: 3, excerpt: "Trăm năm", createdAt: "2026-09-15T00:00:00Z" }],
      updatedAt: "2026-09-15T00:00:00Z",
    };
    await store.writeProgress(book.id, progress);
    expect(await store.readProgress(book.id)).toEqual(progress);
  });

  it("reports unreadable manifests without hiding other books", async () => {
    const book = await store.create(draft);
    const brokenId = randomUUID();
    await mkdir(join(root, brokenId));
    await writeFile(join(root, brokenId, "manifest.json"), "{", "utf8");

    const listing = await store.list();
    expect(listing.books.map((item) => item.id)).toEqual([book.id]);
    expect(listing.unreadable).toEqual([{ bookId: brokenId, message: expect.stringContaining("not valid JSON") }]);
  });

  it("updates metadata and deletes books", async () => {
    const book = await store.create(draft);
    const updated = await store.updateMetadata(book.id, {
      ...draft,
      title: "Kim Vân Kiều",
      visibility: "shared",
      license: " ",
    });
    expect(updated).toMatchObject({ title: "Kim Vân Kiều", visibility: "shared", license: null });

    await store.delete(book.id);
    await expect(store.get(book.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects ids that could escape the library folder", () => {
    expect(() => store.bookPath("../etc")).toThrow(LibraryError);
  });
});
