import {
  BOOK_FORMATS,
  MANIFEST_SCHEMA_VERSION,
  PROGRESS_SCHEMA_VERSION,
  VISIBILITIES,
  type BookManifest,
  type BookSource,
  type Bookmark,
  type ChapterRef,
  type ReadingPosition,
  type ReadingProgress,
} from "./book";
import {
  ValidationError,
  expectArray,
  expectNonNegativeInteger,
  expectNullableString,
  expectRecord,
  expectString,
  expectStringArray,
  isOneOf,
} from "./validation";

const BOOK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAPTER_FILE_PATTERN = /^\d{4}\.md$/;

export function isValidBookId(id: string): boolean {
  return BOOK_ID_PATTERN.test(id);
}

export function chapterFileName(index: number): string {
  return `${String(index + 1).padStart(4, "0")}.md`;
}

function parseSource(value: unknown): BookSource {
  const context = "manifest.source";
  const record = expectRecord(value, context);
  const kind = expectString(record, "kind", context);

  if (kind === "import") {
    const format = expectString(record, "format", context);
    if (!isOneOf(BOOK_FORMATS, format)) {
      throw new ValidationError(`${context}.format "${format}" is not supported`);
    }
    return { kind, format, fileName: expectString(record, "fileName", context) };
  }

  if (kind === "community") {
    return {
      kind,
      slug: expectString(record, "slug", context),
      version: expectString(record, "version", context),
      indexUrl: expectString(record, "indexUrl", context),
    };
  }

  throw new ValidationError(`${context}.kind "${kind}" is not supported`);
}

function parseChapter(value: unknown, index: number): ChapterRef {
  const context = `manifest.chapters[${index}]`;
  const record = expectRecord(value, context);
  const file = expectString(record, "file", context);
  if (!CHAPTER_FILE_PATTERN.test(file)) {
    throw new ValidationError(`${context}.file "${file}" is not a valid chapter file name`);
  }
  return {
    title: expectString(record, "title", context),
    file,
    words: expectNonNegativeInteger(record, "words", context),
  };
}

export function parseManifest(value: unknown): BookManifest {
  const context = "manifest";
  const record = expectRecord(value, context);

  if (record.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new ValidationError(`${context}.schemaVersion ${String(record.schemaVersion)} is not supported`);
  }

  const id = expectString(record, "id", context);
  if (!isValidBookId(id)) {
    throw new ValidationError(`${context}.id "${id}" is not a valid book id`);
  }

  const visibility = expectString(record, "visibility", context);
  if (!isOneOf(VISIBILITIES, visibility)) {
    throw new ValidationError(`${context}.visibility "${visibility}" is not supported`);
  }

  const chapters = expectArray(record, "chapters", context).map(parseChapter);
  if (chapters.length === 0) {
    throw new ValidationError(`${context}.chapters must not be empty`);
  }

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    id,
    title: expectString(record, "title", context),
    authors: expectStringArray(record, "authors", context),
    language: expectString(record, "language", context),
    categories: expectStringArray(record, "categories", context),
    license: expectNullableString(record, "license", context),
    visibility,
    source: parseSource(record.source),
    chapters,
    totalWords: expectNonNegativeInteger(record, "totalWords", context),
    createdAt: expectString(record, "createdAt", context),
    updatedAt: expectString(record, "updatedAt", context),
  };
}

function parsePosition(value: unknown, context: string): ReadingPosition {
  const record = expectRecord(value, context);
  return {
    chapterIndex: expectNonNegativeInteger(record, "chapterIndex", context),
    blockIndex: expectNonNegativeInteger(record, "blockIndex", context),
  };
}

function parseBookmark(value: unknown, index: number): Bookmark {
  const context = `progress.bookmarks[${index}]`;
  const record = expectRecord(value, context);
  return {
    ...parsePosition(record, context),
    excerpt: typeof record.excerpt === "string" ? record.excerpt : "",
    createdAt: expectString(record, "createdAt", context),
  };
}

export function parseProgress(value: unknown): ReadingProgress {
  const context = "progress";
  const record = expectRecord(value, context);

  if (record.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
    throw new ValidationError(`${context}.schemaVersion ${String(record.schemaVersion)} is not supported`);
  }

  const percent = record.percent;
  if (typeof percent !== "number" || percent < 0 || percent > 100) {
    throw new ValidationError(`${context}.percent must be a number between 0 and 100`);
  }

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    position: parsePosition(record.position, `${context}.position`),
    percent,
    bookmarks: expectArray(record, "bookmarks", context).map(parseBookmark),
    updatedAt: expectString(record, "updatedAt", context),
  };
}
