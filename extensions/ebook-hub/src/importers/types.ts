import type { NewChapter } from "../domain/book";

export interface ImportedBook {
  title: string;
  authors: string[];
  /** Raw language tag from the file, if any. */
  language: string | null;
  chapters: NewChapter[];
  /** User-facing notes about import quality. */
  warnings: string[];
}

export type Importer = (data: Uint8Array, fallbackTitle: string) => Promise<ImportedBook>;

export class ImportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ImportError";
  }
}
