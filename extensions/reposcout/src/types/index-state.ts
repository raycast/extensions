import type { RepositoryRecord } from "./repository";

/**
 * The current schema version of the persisted index. Bump this whenever the
 * shape of {@link RepositoryIndex} or {@link RepositoryRecord} changes in a way
 * that makes older cache files unreadable. The cache layer discards indexes with
 * a mismatched version and re-scans from scratch.
 */
export const INDEX_SCHEMA_VERSION = 1;

/**
 * The persisted repository index: the single source of truth that search reads
 * from. It is written by the indexer and never touched by the UI directly.
 */
export interface RepositoryIndex {
  /** Schema version of this payload; see {@link INDEX_SCHEMA_VERSION}. */
  readonly version: number;
  /** Unix milliseconds when a full or incremental refresh last completed. */
  readonly updatedAt: number;
  /** All known repositories, keyed by path in {@link records}. */
  readonly records: readonly RepositoryRecord[];
}

/** Lifecycle phase of an in-flight indexing run, surfaced to the UI. */
export type IndexingPhase = "idle" | "discovering" | "enriching" | "done" | "error";

/** Progress information emitted while an index refresh is running. */
export interface IndexingProgress {
  readonly phase: IndexingPhase;
  /** Number of repositories discovered so far. */
  readonly discovered: number;
  /** Number of repositories whose Git metadata has been (re)computed. */
  readonly enriched: number;
  /** Human-readable message for the current step, if any. */
  readonly message?: string;
}
