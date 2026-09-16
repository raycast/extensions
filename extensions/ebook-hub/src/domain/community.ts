import { errorMessage } from "../errors";
import {
  ValidationError,
  expectArray,
  expectRecord,
  expectString,
  expectStringArray,
  isOneOf,
  type JsonRecord,
} from "./validation";

/** Licenses accepted by the Community Library. See ADR-0005. */
export const ALLOWED_LICENSES = ["public-domain", "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"] as const;
export type CommunityLicense = (typeof ALLOWED_LICENSES)[number];

export const COMMUNITY_INDEX_SCHEMA_VERSION = 1;
export const BOOK_FILE = "book.json";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export interface CommunityFile {
  path: string;
  sha256: string;
}

export interface CommunityBookEntry {
  slug: string;
  version: string;
  title: string;
  authors: string[];
  language: string;
  categories: string[];
  license: CommunityLicense;
  summary: string;
  path: string;
  files: CommunityFile[];
}

export interface CommunityIndex {
  schemaVersion: typeof COMMUNITY_INDEX_SCHEMA_VERSION;
  generatedAt: string;
  repository: string;
  ref: string;
  books: CommunityBookEntry[];
}

export interface SkippedEntry {
  position: number;
  reason: string;
}

export interface ParsedCommunityIndex {
  index: CommunityIndex;
  skipped: SkippedEntry[];
}

export interface CommunityBookFile {
  title: string;
  authors: string[];
  language: string;
  categories: string[];
  license: CommunityLicense;
  source: string;
  chapters: { title: string; file: string }[];
}

/** Relative POSIX path without `.`/`..` segments, hidden files, or absolute roots. */
export function isSafeRelativePath(path: string): boolean {
  return path.split("/").every((segment) => SAFE_SEGMENT.test(segment));
}

function expectLicense(record: JsonRecord, context: string): CommunityLicense {
  const license = expectString(record, "license", context);
  if (!isOneOf(ALLOWED_LICENSES, license)) {
    throw new ValidationError(`${context}.license "${license}" is not an allowed license`);
  }
  return license;
}

function expectSafePath(record: JsonRecord, key: string, context: string): string {
  const path = expectString(record, key, context);
  if (!isSafeRelativePath(path)) {
    throw new ValidationError(`${context}.${key} "${path}" is not a safe relative path`);
  }
  return path;
}

function parseFile(value: unknown, context: string): CommunityFile {
  const record = expectRecord(value, context);
  const sha256 = expectString(record, "sha256", context);
  if (!SHA256_PATTERN.test(sha256)) {
    throw new ValidationError(`${context}.sha256 must be a lowercase hex SHA-256 digest`);
  }
  return { path: expectSafePath(record, "path", context), sha256 };
}

function parseEntry(value: unknown, position: number): CommunityBookEntry {
  const context = `index.books[${position}]`;
  const record = expectRecord(value, context);
  const slug = expectString(record, "slug", context);
  if (!SAFE_SEGMENT.test(slug)) {
    throw new ValidationError(`${context}.slug "${slug}" is not a valid slug`);
  }
  const files = expectArray(record, "files", context).map((file, index) =>
    parseFile(file, `${context}.files[${index}]`),
  );
  if (!files.some((file) => file.path === BOOK_FILE)) {
    throw new ValidationError(`${context}.files must include ${BOOK_FILE}`);
  }
  return {
    slug,
    version: expectString(record, "version", context),
    title: expectString(record, "title", context),
    authors: expectStringArray(record, "authors", context),
    language: expectString(record, "language", context),
    categories: expectStringArray(record, "categories", context),
    license: expectLicense(record, context),
    summary: typeof record.summary === "string" ? record.summary : "",
    path: expectSafePath(record, "path", context),
    files,
  };
}

/**
 * Parse the community index. Invalid book entries are skipped (and reported)
 * so one bad entry cannot hide the whole library; an invalid envelope throws.
 */
export function parseCommunityIndex(value: unknown): ParsedCommunityIndex {
  const context = "index";
  const record = expectRecord(value, context);
  if (record.schemaVersion !== COMMUNITY_INDEX_SCHEMA_VERSION) {
    throw new ValidationError(`${context}.schemaVersion ${String(record.schemaVersion)} is not supported`);
  }
  const repository = expectString(record, "repository", context);
  if (!repository.startsWith("https://github.com/")) {
    throw new ValidationError(`${context}.repository must be a https://github.com/ URL`);
  }

  const books: CommunityBookEntry[] = [];
  const skipped: SkippedEntry[] = [];
  expectArray(record, "books", context).forEach((entry, position) => {
    try {
      books.push(parseEntry(entry, position));
    } catch (error) {
      // Entry parsing only raises schema errors; report them instead of hiding the whole library.
      skipped.push({ position, reason: errorMessage(error) });
    }
  });

  return {
    index: {
      schemaVersion: COMMUNITY_INDEX_SCHEMA_VERSION,
      generatedAt: expectString(record, "generatedAt", context),
      repository,
      ref: expectString(record, "ref", context),
      books,
    },
    skipped,
  };
}

export function parseCommunityBookFile(value: unknown): CommunityBookFile {
  const context = BOOK_FILE;
  const record = expectRecord(value, context);
  const chapters = expectArray(record, "chapters", context).map((chapter, index) => {
    const chapterContext = `${context}.chapters[${index}]`;
    const chapterRecord = expectRecord(chapter, chapterContext);
    return {
      title: expectString(chapterRecord, "title", chapterContext),
      file: expectSafePath(chapterRecord, "file", chapterContext),
    };
  });
  if (chapters.length === 0) {
    throw new ValidationError(`${context}.chapters must not be empty`);
  }
  return {
    title: expectString(record, "title", context),
    authors: expectStringArray(record, "authors", context),
    language: expectString(record, "language", context),
    categories: expectStringArray(record, "categories", context),
    license: expectLicense(record, context),
    source: expectString(record, "source", context),
    chapters,
  };
}

export function githubTreeUrl(index: CommunityIndex, entry: CommunityBookEntry): string {
  return `${index.repository.replace(/\/+$/, "")}/tree/${encodeURIComponent(index.ref)}/${entry.path}`;
}
