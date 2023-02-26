export interface AlgoliaSearchResult {
  hits: Hit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustiveTypo: boolean;
  exhaustive: Exhaustive;
  params: string;
  index: string;
  processingTimeMS: number;
  processingTimingsMS: ProcessingTimingsMS;
  serverTimeMS: number;
}

export interface Exhaustive {
  nbHits: boolean;
  typo: boolean;
}

export interface Hit {
  url: string;
  content: null;
  type: Type;
  hierarchy: { [key: string]: null | string };
  objectID: string;
  _snippetResult: SnippetResult;
  _highlightResult: HighlightResult;
}

export interface HighlightResult {
  hierarchy: { [key: string]: HighlightResultHierarchy };
}

export interface HighlightResultHierarchy {
  value: string;
  matchLevel: MatchLevel;
  fullyHighlighted?: boolean;
  matchedWords: Record<string, string>[];
}

export enum MatchLevel {
  Full = "full",
  None = "none",
}

export interface SnippetResult {
  hierarchy: { [key: string]: SnippetResultHierarchy };
}

export interface SnippetResultHierarchy {
  value: string;
  matchLevel: MatchLevel;
}

export enum Type {
  Lvl1 = "lvl1",
  Lvl2 = "lvl2",
  Lvl3 = "lvl3",
}

export interface ProcessingTimingsMS {
  fetch: Fetch;
  request: Request;
  total: number;
}

export interface Fetch {
  scanning: number;
  total: number;
}

export interface Request {
  roundTrip: number;
}
