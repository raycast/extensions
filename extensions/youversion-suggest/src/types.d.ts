// A type that represents any JSON-serializable value or structure
export type JSONSerializable =
  | string
  | number
  | boolean
  | Array<JSONSerializable>
  | object
  | { [key: string]: JSONSerializable }
  | null;

// Types for JSON Bible data

export type BibleBookId = string;

export interface BibleBook {
  id: BibleBookId;
  name: string;
}

export type BibleVersionId = number;

export interface BibleVersion {
  id: BibleVersionId;
  name: string;
  full_name: string;
}

export type BibleLanguageId = string;

export interface BibleLanguage {
  id: BibleLanguageId;
  name: string;
}

export interface BibleData {
  books: BibleBook[];
  versions: BibleVersion[];
  default_version: BibleVersionId;
  language: BibleLanguage;
}

export interface BibleBookMetadata {
  canon: string;
  chapters: number;
  verses: number[];
}

export interface BibleReference {
  id: string;
  url: string;
  name: string;
  book: BibleBook;
  chapter: number;
  verse: number | null;
  endVerse: number | null;
  version: BibleVersion;
  content?: string;
}
