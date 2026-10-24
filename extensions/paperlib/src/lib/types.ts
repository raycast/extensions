export interface PaperTag {
  name: string;
  color?: string;
}

export interface PaperEntity {
  id: string;
  title: string;
  authors: string;
  /** Abstract from an import or live API response. */
  abstract: string;
  note: string;
  publication: string;
  pubTime: string;
  pubType: number;
  doi: string;
  arxiv: string;
  mainURL: string;
  publisher: string;
  pages: string;
  volume: string;
  number: string;
  rating: number;
  flag: boolean;
  tags: PaperTag[];
  folders: PaperTag[];
  addTime?: string;
}

export type LibrarySource = "api" | "cache" | "local" | "demo";

export interface SearchResult {
  papers: PaperEntity[];
  source: LibrarySource;
  sourceLabel: string;
  /** Folder used to resolve relative Paperlib mainURL PDF paths. */
  libraryFolder?: string;
}

export interface LibraryPreferences {
  apiHost: string;
  localLibraryFile?: string;
  libraryFolder?: string;
  useDemoFallback: boolean;
  fetchRemoteAbstracts: boolean;
  citationStyle: "apa" | "harvard";
  resultLimit: number;
}

export class LibraryUnavailableError extends Error {
  readonly hints: string[];

  constructor(message: string, hints: string[] = []) {
    super(message);
    this.name = "LibraryUnavailableError";
    this.hints = hints;
  }
}

export const DEFAULT_API_HOST = "http://127.0.0.1:21227";
export const DEFAULT_RESULT_LIMIT = 50;
