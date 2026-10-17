import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  MANIFEST_SCHEMA_VERSION,
  type BookManifest,
  type BookMetadata,
  type NewBook,
  type ReadingProgress,
} from "../domain/book";
import { normalizeLanguageTag } from "../domain/languages";
import { chapterFileName, isValidBookId, parseManifest, parseProgress } from "../domain/manifest";
import { sanitizeMarkdown } from "../domain/sanitize";
import { countWords } from "../domain/text";
import { errorMessage } from "../errors";

export type LibraryErrorCode = "not_found" | "invalid" | "io";

export class LibraryError extends Error {
  readonly code: LibraryErrorCode;

  constructor(code: LibraryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LibraryError";
    this.code = code;
  }
}

export interface UnreadableBook {
  bookId: string;
  message: string;
}

export interface LibraryListing {
  books: BookManifest[];
  unreadable: UnreadableBook[];
}

const MANIFEST_FILE = "manifest.json";
const PROGRESS_FILE = "progress.json";
const CHAPTERS_DIR = "chapters";
const TEMP_PREFIX = ".tmp-";

type JsonRead = { found: false } | { found: true; value: unknown };

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isNotFound(error: unknown): boolean {
  return isErrnoException(error) && error.code === "ENOENT";
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function normalizeMetadata(metadata: BookMetadata): BookMetadata {
  const license = metadata.license?.trim() ?? "";
  return {
    title: metadata.title.trim(),
    authors: metadata.authors.map((author) => author.trim()).filter((author) => author !== ""),
    language: normalizeLanguageTag(metadata.language),
    categories: [
      ...new Set(metadata.categories.map((category) => category.trim().toLowerCase()).filter((c) => c !== "")),
    ],
    license: license === "" ? null : license,
    visibility: metadata.visibility,
  };
}

/** Parse errors are always schema problems, so they surface as `invalid`. */
function validated(manifest: unknown): BookManifest {
  try {
    return parseManifest(manifest);
  } catch (error) {
    throw new LibraryError("invalid", errorMessage(error), { cause: error });
  }
}

/**
 * File-backed library under a root folder. Layout and guarantees are described
 * in ADR-0004.
 */
export class LibraryStore {
  constructor(private readonly root: string) {}

  bookPath(bookId: string): string {
    if (!isValidBookId(bookId)) {
      throw new LibraryError("invalid", `Invalid book id "${bookId}"`);
    }
    return join(this.root, bookId);
  }

  async list(): Promise<LibraryListing> {
    let entries;
    try {
      entries = await readdir(this.root, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) {
        return { books: [], unreadable: [] };
      }
      throw new LibraryError("io", "Could not read the library folder", { cause: error });
    }

    const books: BookManifest[] = [];
    const unreadable: UnreadableBook[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !isValidBookId(entry.name)) {
        continue;
      }
      try {
        books.push(await this.get(entry.name));
      } catch (error) {
        unreadable.push({ bookId: entry.name, message: errorMessage(error) });
      }
    }
    return { books, unreadable };
  }

  async get(bookId: string): Promise<BookManifest> {
    const read = await this.readJson(join(this.bookPath(bookId), MANIFEST_FILE), `the manifest of book ${bookId}`);
    if (!read.found) {
      throw new LibraryError("not_found", `Book ${bookId} was not found`);
    }
    const manifest = validated(read.value);
    if (manifest.id !== bookId) {
      throw new LibraryError("invalid", `Book ${bookId} has a manifest for ${manifest.id}`);
    }
    return manifest;
  }

  async readChapter(book: BookManifest, chapterIndex: number): Promise<string> {
    const chapter = book.chapters[chapterIndex];
    if (!chapter) {
      throw new LibraryError("not_found", `Chapter ${chapterIndex + 1} does not exist`);
    }
    try {
      return await readFile(join(this.bookPath(book.id), CHAPTERS_DIR, chapter.file), "utf8");
    } catch (error) {
      throw new LibraryError(isNotFound(error) ? "not_found" : "io", `Could not read chapter "${chapter.title}"`, {
        cause: error,
      });
    }
  }

  async create(draft: NewBook): Promise<BookManifest> {
    const chapters = draft.chapters
      .map((chapter) => ({ title: chapter.title.trim() || "Untitled", markdown: sanitizeMarkdown(chapter.markdown) }))
      .filter((chapter) => countWords(chapter.markdown) > 0);
    if (chapters.length === 0) {
      throw new LibraryError("invalid", "The book has no readable text");
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const refs = chapters.map((chapter, index) => ({
      title: chapter.title,
      file: chapterFileName(index),
      words: countWords(chapter.markdown),
    }));
    const manifest = validated({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      id,
      ...normalizeMetadata(draft),
      source: draft.source,
      chapters: refs,
      totalWords: refs.reduce((sum, ref) => sum + ref.words, 0),
      createdAt: now,
      updatedAt: now,
    });

    const tempDir = join(this.root, `${TEMP_PREFIX}${id}`);
    try {
      await mkdir(join(tempDir, CHAPTERS_DIR), { recursive: true });
      await Promise.all(
        chapters.map((chapter, index) =>
          writeFile(join(tempDir, CHAPTERS_DIR, refs[index].file), `${chapter.markdown}\n`, "utf8"),
        ),
      );
      await writeFile(join(tempDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      await rename(tempDir, this.bookPath(id));
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      throw new LibraryError("io", "Could not save the book", { cause: error });
    }
    return manifest;
  }

  async updateMetadata(bookId: string, metadata: BookMetadata): Promise<BookManifest> {
    const current = await this.get(bookId);
    const next = validated({ ...current, ...normalizeMetadata(metadata), updatedAt: new Date().toISOString() });
    try {
      await writeJsonAtomic(join(this.bookPath(bookId), MANIFEST_FILE), next);
    } catch (error) {
      throw new LibraryError("io", `Could not update "${current.title}"`, { cause: error });
    }
    return next;
  }

  async delete(bookId: string): Promise<void> {
    try {
      await rm(this.bookPath(bookId), { recursive: true });
    } catch (error) {
      if (isNotFound(error)) {
        throw new LibraryError("not_found", `Book ${bookId} was not found`, { cause: error });
      }
      throw new LibraryError("io", `Could not delete book ${bookId}`, { cause: error });
    }
  }

  /** Returns `null` when the book has never been opened. */
  async readProgress(bookId: string): Promise<ReadingProgress | null> {
    const read = await this.readJson(join(this.bookPath(bookId), PROGRESS_FILE), `the progress of book ${bookId}`);
    if (!read.found) {
      return null;
    }
    try {
      return parseProgress(read.value);
    } catch (error) {
      throw new LibraryError("invalid", `Saved progress is invalid: ${errorMessage(error)}`, { cause: error });
    }
  }

  async writeProgress(bookId: string, progress: ReadingProgress): Promise<void> {
    try {
      await writeJsonAtomic(join(this.bookPath(bookId), PROGRESS_FILE), progress);
    } catch (error) {
      throw new LibraryError("io", "Could not save reading progress", { cause: error });
    }
  }

  private async readJson(filePath: string, label: string): Promise<JsonRead> {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error) {
      if (isNotFound(error)) {
        return { found: false };
      }
      throw new LibraryError("io", `Could not read ${label}`, { cause: error });
    }
    try {
      return { found: true, value: JSON.parse(text) as unknown };
    } catch (error) {
      throw new LibraryError("invalid", `${label} is not valid JSON`, { cause: error });
    }
  }
}
