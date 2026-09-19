import type { DatabaseSync } from "node:sqlite";
import {
  IndexRoot,
  IndexStats,
  openIndexForRead,
  readIndexRoots,
  readIndexStats,
} from "./index-db";
import { queryIndex } from "./db-search";
import { ParsedQuery } from "./query";
import { Entry } from "./types";

/**
 * The search view's read connection.
 *
 * One connection per process, reused across queries. Opening costs about 1ms
 * and a prepared statement about 0.05ms, so reopening per keystroke would not
 * be ruinous; the cache exists so a rebuild can invalidate it in one place and
 * so repeated queries reuse SQLite's page cache rather than refilling it.
 *
 * "Missing" is an ordinary state. Until the index has been built once, search
 * runs on memory sources alone and says so, rather than reporting an error.
 *
 * The database path is passed in rather than derived from Raycast's
 * `environment`, so this module stays exercisable by the harness.
 */

export type IndexStatus = "ready" | "missing" | "failed";

type Cached = {
  file: string;
  status: IndexStatus;
  db?: DatabaseSync;
  error?: string;
};

let cached: Cached | undefined;

function open(file: string): Cached {
  const result = openIndexForRead(file);
  if (result.kind === "opened") return { file, status: "ready", db: result.db };
  if (result.kind === "missing") return { file, status: "missing" };
  return { file, status: "failed", error: result.error };
}

function connection(file: string): Cached {
  // A separate command may create or repair the database after a failed open.
  if (cached?.db && cached.file === file) return cached;
  closeIndexReader();
  cached = open(file);
  return cached;
}

/** Drop the cached connection; the next query reopens. */
export function closeIndexReader(): void {
  const previous = cached;
  cached = undefined;
  try {
    previous?.db?.close();
  } catch {
    /* A connection that will not close is being discarded anyway. */
  }
}

export type IndexSearchResult = {
  status: IndexStatus;
  entries: Entry[];
  truncated: boolean;
  /** Typed text was shorter than the index minimum. */
  tooShort: boolean;
  error?: string;
  elapsedMs: number;
};

const empty = (status: IndexStatus, error?: string): IndexSearchResult => ({
  status,
  entries: [],
  truncated: false,
  tooShort: false,
  error,
  elapsedMs: 0,
});

/** Run one bounded query against the index. */
export function searchIndex(
  file: string,
  parsed: ParsedQuery,
  opts: { showHidden?: boolean; limit?: number } = {},
): IndexSearchResult {
  const active = connection(file);
  if (active.status !== "ready" || !active.db)
    return empty(active.status, active.error);
  const result = queryIndex(active.db, parsed, opts);
  if (result.error) {
    // A statement failure can mean the file was replaced underneath us.
    closeIndexReader();
    return empty("failed", result.error);
  }
  return {
    status: "ready",
    entries: result.entries,
    truncated: result.truncated,
    tooShort: result.tooShort,
    elapsedMs: result.elapsedMs,
  };
}

export type IndexCoverage = {
  status: IndexStatus;
  roots: IndexRoot[];
  files: number;
  error?: string;
};

/** What the index currently covers, for the status line and the setup screen. */
export function readIndexCoverage(file: string): IndexCoverage {
  const active = connection(file);
  if (active.status !== "ready" || !active.db)
    return {
      status: active.status,
      roots: [],
      files: 0,
      error: active.error,
    };
  try {
    // Scan summaries are already counted by the writer. Recounting the file
    // table here reads hundreds of MB just to label a newly opened screen.
    const roots = readIndexRoots(active.db);
    return {
      status: "ready",
      roots,
      files: roots.reduce((total, root) => total + root.files, 0),
    };
  } catch (error) {
    closeIndexReader();
    return {
      status: "failed",
      roots: [],
      files: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Counts for the settings screen, or undefined when there is no index. */
export function readStats(file: string): IndexStats | undefined {
  const active = connection(file);
  if (active.status !== "ready" || !active.db) return undefined;
  try {
    return readIndexStats(active.db, file);
  } catch {
    closeIndexReader();
    return undefined;
  }
}

/**
 * One sentence describing what a readable index covers.
 *
 * Only for a ready index. The caller decides what to say about one that is
 * missing or unreadable, because the useful thing to say there is which action
 * fixes it. The parameter is narrowed so those cases cannot reach here: as a
 * wider signature it also carried branches for them, and they were dead.
 */
export type ReadyCoverage = IndexCoverage & { status: "ready" };

/** Narrows a coverage read, so describeCoverage cannot be handed a bad one. */
export function isReadyCoverage(
  coverage: IndexCoverage | undefined,
): coverage is ReadyCoverage {
  return coverage !== undefined && coverage.status === "ready";
}

export function describeCoverage(coverage: ReadyCoverage): string {
  const incomplete = coverage.roots.filter((root) => !root.complete);
  const files = `${coverage.files.toLocaleString()} indexed`;
  if (coverage.roots.length === 0) return `${files} · no indexed locations`;
  if (incomplete.length === 0) return files;
  return `${files} · ${incomplete.length} of ${coverage.roots.length} locations incomplete`;
}
