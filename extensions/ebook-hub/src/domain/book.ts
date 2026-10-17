export const BOOK_FORMATS = ["md", "txt", "epub", "pdf"] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

export const VISIBILITIES = ["private", "shared"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const MANIFEST_SCHEMA_VERSION = 1;
export const PROGRESS_SCHEMA_VERSION = 1;

export type BookSource =
  | { kind: "import"; format: BookFormat; fileName: string }
  | { kind: "community"; slug: string; version: string; indexUrl: string };

export interface ChapterRef {
  title: string;
  /** File name inside the book's `chapters/` folder, e.g. `0001.md`. */
  file: string;
  words: number;
}

export interface BookMetadata {
  title: string;
  authors: string[];
  /** BCP 47 primary language subtag, or `und` when unknown. */
  language: string;
  categories: string[];
  /** SPDX identifier or `public-domain`; required for shared books. */
  license: string | null;
  visibility: Visibility;
}

export interface BookManifest extends BookMetadata {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  id: string;
  source: BookSource;
  chapters: ChapterRef[];
  totalWords: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewChapter {
  title: string;
  markdown: string;
}

export interface NewBook extends BookMetadata {
  source: BookSource;
  chapters: NewChapter[];
}

export interface ReadingPosition {
  chapterIndex: number;
  blockIndex: number;
}

export interface Bookmark extends ReadingPosition {
  excerpt: string;
  createdAt: string;
}

export interface ReadingProgress {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  position: ReadingPosition;
  percent: number;
  bookmarks: Bookmark[];
  updatedAt: string;
}

export const START_POSITION: ReadingPosition = { chapterIndex: 0, blockIndex: 0 };
