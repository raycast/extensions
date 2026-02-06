/**
 * Type definitions for the Brew extension.
 *
 * Contains all shared types for Homebrew data structures.
 */

/// Exec Types

export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/// Base Types

export interface Nameable {
  name: string;
}

interface Installable {
  tap: string;
  desc?: string;
  homepage: string;
  versions: Versions;
  outdated: boolean;
  caveats?: string;
}

/// Cask Types

export interface Cask extends Installable {
  token: string;
  name: string[];
  version: string;
  installed?: string; // version
  auto_updates: boolean;
  depends_on: CaskDependency;
  conflicts_with?: { cask: string[] };
}

export interface CaskDependency {
  macos?: { [key: string]: string[] };
}

/// Formula Types

export interface Formula extends Installable, Nameable {
  license: string | null;
  aliases: string[];
  dependencies: string[];
  build_dependencies: string[];
  installed: InstalledVersion[];
  keg_only: boolean;
  linked_key: string;
  pinned: boolean;
  conflicts_with?: string[];
}

export interface InstalledVersion {
  version: string;
  installed_as_dependency: boolean;
  installed_on_request: boolean;
}

export interface Versions {
  stable: string;
  head?: string;
  bottle: boolean;
}

/// Outdated Types

interface Outdated extends Nameable {
  current_version: string;
}

export interface OutdatedFormula extends Outdated {
  installed_versions: string[];
  pinned_version?: string;
  pinned: boolean;
}

export interface OutdatedCask extends Outdated {
  installed_versions: string;
}

/// Result Types

export interface InstallableResults {
  formulae: Formula[];
  casks: Cask[];
}

export interface OutdatedResults {
  formulae: OutdatedFormula[];
  casks: OutdatedCask[];
}

export interface InstalledMap {
  formulae: Map<string, Formula>;
  casks: Map<string, Cask>;
}

/// Remote Types

export interface Remote<T> {
  url: string;
  cachePath: string;
  value?: T[];
  /** in flight fetch of the remote */
  fetch?: Promise<T[]>;
}

/// Download Progress Types

export interface DownloadProgress {
  /** URL being downloaded */
  url: string;
  /** Bytes downloaded so far */
  bytesDownloaded: number;
  /** Total bytes (from Content-Length header, may be 0 if unknown) */
  totalBytes: number;
  /** Download percentage (0-100), or -1 if total is unknown */
  percent: number;
  /** Whether download is complete */
  complete: boolean;
  /** Current phase: downloading or processing */
  phase?: "downloading" | "processing";
  /** Number of items processed so far (during processing phase) */
  itemsProcessed?: number;
  /** Total number of items (known after processing completes) */
  totalItems?: number;
  /** Whether an error occurred during download/processing */
  error?: boolean;
  /** Error message if error is true */
  errorMessage?: string;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/// Chunked Cache Types

/** Index entry for chunked cache - contains searchable fields and chunk reference */
export interface IndexEntry {
  /** Unique identifier: name for formulae, token for casks */
  id: string;
  /** Name/token lowercased for search */
  n: string;
  /** Description lowercased (truncated ~100 chars) */
  d?: string;
  /** Aliases lowercased (formula only) */
  a?: string[];
  /** Chunk number (0-indexed) */
  c: number;
  /** Index within chunk (0-indexed) */
  i: number;
}

/** Metadata for chunked cache */
export interface ChunkedCacheMeta {
  /** Schema version for future migrations */
  version: number;
  /** Original source URL for staleness check */
  sourceUrl: string;
  /** Last-Modified header timestamp (ms) */
  lastModified: number;
  /** When cache was built */
  createdAt: number;
  /** Total number of items */
  totalItems: number;
  /** Items per chunk */
  chunkSize: number;
  /** Number of chunk files */
  chunkCount: number;
  /** Type of data */
  type: "formula" | "cask";
}

/** Configuration for chunked cache paths */
export interface ChunkedCacheConfig {
  /** Base directory for chunks (e.g., supportPath/formula/) */
  baseDir: string;
  /** Path to index.json */
  indexPath: string;
  /** Path to meta.json */
  metaPath: string;
  /** Type of data */
  type: "formula" | "cask";
}

/** In-memory index loaded from chunked cache */
export interface CacheIndex {
  /** Index entries for searching */
  entries: IndexEntry[];
  /** Cache metadata */
  meta: ChunkedCacheMeta;
}

/** Extended Remote type with chunked cache support */
export interface ChunkedRemote<T> extends Remote<T> {
  /** Chunked cache configuration */
  chunkedConfig: ChunkedCacheConfig;
  /** Cached index (loaded once) */
  index?: CacheIndex;
  /** In-flight index fetch for deduplication */
  indexFetch?: Promise<CacheIndex>;
}
