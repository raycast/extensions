import type { CaseMode, SearchMode } from "./preferences";

export type SearchEngineType = "bundled-ripgrep" | "system-ripgrep" | "node-fallback";

export type SearchStatus = "idle" | "searching" | "done" | "cancelled" | "error";

export interface SearchResult {
  /** Absolute path to the matched file. */
  filePath: string;
  /** Path relative to the active search directory. */
  relativePath: string;
  fileName: string;
  /** 1-based line number of the match. */
  line: number;
  /** 1-based column number of the match. */
  column: number;
  /** The matching line, truncated for display safety. */
  lineText: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

/** Fully validated, contradiction-free options handed to an engine. */
export interface SearchOptions {
  caseMode: CaseMode;
  searchMode: SearchMode;
  wholeWord: boolean;
  multiline: boolean;
  invertMatch: boolean;
  /** null means unlimited depth; 1 means the search directory only. */
  maxDepth: number | null;
  includeHidden: boolean;
  followSymlinks: boolean;
  respectIgnoreFiles: boolean;
  includeBinary: boolean;
  searchFileNames: boolean;
  includedExtensions: string[];
  excludedExtensions: string[];
  excludedDirectories: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
  maxResults: number;
  maxFileSizeBytes: number;
  contextBefore: number;
  contextAfter: number;
}

export type SearchErrorKind =
  | "finder-unavailable"
  | "finder-permission-denied"
  | "directory-inaccessible"
  | "picker-cancelled"
  | "engine-unavailable"
  | "engine-startup-failed"
  | "engine-crashed"
  | "invalid-query"
  | "invalid-glob"
  | "unexpected";

export interface SearchError {
  kind: SearchErrorKind;
  message: string;
}

/** Events documented for `rg --json`; anything else must be tolerated as unknown. */
export type RipgrepEventKind = "begin" | "match" | "context" | "end" | "summary";

export interface RipgrepEvent {
  type: RipgrepEventKind;
  data: unknown;
}

export interface SearchRequest {
  /** Non-empty query; engines never receive an empty string. */
  query: string;
  /** Validated absolute search root. Never derived from the query or options. */
  directory: string;
  /** Normalized via `normalizeSearchOptions` — engines may trust its invariants. */
  options: SearchOptions;
  /** Aborting must terminate the underlying process/scan promptly. */
  signal: AbortSignal;
  /**
   * Ordered result batches. Engines must never emit after the returned promise
   * settles or after `signal` aborts, and must never exceed `options.maxResults`
   * results in total.
   */
  onResults: (batch: SearchResult[]) => void;
}

export interface SearchCompletion {
  /** True when the search stopped because `options.maxResults` was hit. */
  limitReached: boolean;
  /** True when the search stopped because `signal` aborted. */
  cancelled: boolean;
}

/**
 * Common engine contract.
 *
 * Completion semantics: the promise resolves on normal completion (including
 * no matches), on cancellation, and on limit-reached — cancellation is not an
 * error. It rejects with a `SearchError` for startup failures
 * (`engine-startup-failed`), invalid queries (`invalid-query`), crashes or
 * unexpected exit codes (`engine-crashed`), and anything else (`unexpected`).
 * Results already emitted before a rejection remain valid partial output.
 */
export interface SearchEngine {
  type: SearchEngineType;
  search(request: SearchRequest): Promise<SearchCompletion>;
}
