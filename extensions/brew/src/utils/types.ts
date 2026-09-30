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
  /** Null for a formula loaded from a path or URL, and for a tapless cask. */
  tap: string | null;
  desc?: string;
  homepage: string;
  versions: Versions;
  outdated: boolean;
  caveats?: string;
  /**
   * Installs over the analytics ranking period, stamped on by `brewSearch`
   * when results are sorted by popularity. Absent otherwise.
   */
  installs?: number;
}

/// Cask Types

export interface Cask extends Installable {
  token: string;
  name: string[];
  version: string;
  installed?: string; // version
  /** Unix seconds when this cask was installed or last upgraded. */
  installed_time?: number;
  auto_updates: boolean;
  /** Casks have been pinnable since Homebrew 5.1.12. */
  pinned: boolean;
  pinned_version?: string | null;
  depends_on: CaskDependency;
  conflicts_with?: { cask: string[] };
  /** Homebrew refuses to install a disabled cask. Absent from pre-2026 chunk caches. */
  disabled?: boolean;
  /** From `brew info --json=v2` and the formulae.brew.sh index. Absent on records that predate it. */
  artifacts?: CaskArtifact[];
  /**
   * Derived, not from brew: whether `artifacts[]` held a stanza that
   * `brew link --cask` would touch. The chunked cache stores this in place of
   * the array, which is far larger than the one bit read from it. Absent on
   * chunks written before the flag existed, and on live `brew info` records,
   * which carry the array itself — read both through `caskHasSymlinkArtifacts`.
   */
  has_symlink_artifacts?: boolean;
  /**
   * Language codes the cask can be installed as (`brew install --language=`).
   * Empty for almost every cask; absent from records that predate the field.
   */
  languages?: string[];
}

/**
 * One entry of a cask's `artifacts[]`, keyed by its stanza name (`binary`,
 * `app`, `manpage`, `zap`, …). `target` is present only for `Relocated`
 * artifacts (`cask/cask.rb`); the stanza values vary by kind, hence `unknown`.
 */
export interface CaskArtifact {
  target?: string;
  [stanza: string]: unknown;
}

export interface CaskDependency {
  macos?: { [key: string]: string[] };
  /** A separate key rather than a `<=` under `macos` (cask/dsl/depends_on.rb). */
  maximum_macos?: { [key: string]: string[] };
  /** A Ruby inspect string in the API JSON; only its presence is meaningful. */
  linux?: unknown;
  /** Casks can depend on formulae and other casks, not just an OS version. */
  formula?: string[];
  cask?: string[];
  arch?: { type: string; bits?: number }[];
}

/// Formula Types

/**
 * One entry of a formula's `requirements[]`: `macos`, `maximum_macos`, `arch`,
 * `linux`, `xcode`, … `version` is a macOS major ("11"…"27") or an arch name,
 * and is null for a bare requirement. `contexts` is `["build"]`/`["test"]` or
 * empty, and is typed loosely because the API is free to add shapes to it.
 */
export interface FormulaRequirement {
  name: string;
  version: string | null;
  contexts?: unknown[];
}

export interface Formula extends Installable, Nameable {
  /**
   * Homebrew's rebuild counter for the SAME upstream version, absent from
   * `versions.stable`. A revision bump is a real upgrade — `brew outdated`
   * reports `2026.8.19` → `2026.8.19_1` — so anything naming the available
   * version has to compose the two. Optional because the search index strips
   * the field; only `brew info` output carries it.
   */
  revision?: number;
  license: string | null;
  aliases: string[];
  /**
   * Names this formula used to go by. `brew leaves` counts them among a
   * formula's `possible_names` when deciding whether anything depends on it
   * (`cmd/leaves.rb`). Optional: only `brew info` output carries the key.
   */
  oldnames?: string[];
  dependencies: string[];
  build_dependencies: string[];
  installed: InstalledVersion[];
  keg_only: boolean;
  linked_keg: string | null;
  pinned: boolean;
  conflicts_with?: string[];
  /**
   * Optional across the board: a chunk cache built before the keys were kept,
   * a persisted `useCachedPromise` result, and `brew info --json=v2` (which
   * always reports `requirements: []`) all lack them.
   */
  requirements?: FormulaRequirement[];
  disabled?: boolean;
}

export interface InstalledVersion {
  version: string;
  /**
   * False when Homebrew installed this only to satisfy another package's
   * dependency. Homebrew removed `installed_as_dependency` in 5.1.9 and treats
   * this as the source of truth, so derive "is a dependency" from `!installed_on_request`.
   */
  installed_on_request: boolean;
  /** Unix seconds when this version was installed. Absent from the web API. */
  time?: number;
  /** Tab runtime deps for this keg. Present in `brew info --json=v2 --installed` output only. */
  runtime_dependencies?: { full_name: string; version: string; declared_directly?: boolean }[];
}

export interface Versions {
  stable: string;
  head?: string;
  bottle: boolean;
}

/**
 * Anything the extension can pin. `OutdatedCask` carries only the token that
 * `normalizeOutdatedResults` synthesises, so pin operations take an explicit
 * kind rather than depending on that normalization having run.
 */
export type Pinnable = Formula | OutdatedFormula | Cask | OutdatedCask;

export type PinKind = "formula" | "cask";

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
  /**
   * Synthesised, not reported by brew: `brew outdated --json=v2` gives casks a
   * `name` and no `token`, but `isCask()` — and therefore `brewCaskOption`,
   * `brewIdentifier` and every argv built from them — keys off `token`. Without
   * it an outdated cask is indistinguishable from a formula and gets
   * formula-shaped brew commands.
   *
   * `normalizeOutdatedResults` fills it in. EVERY ingress must call it: both
   * parsers of that payload, and any read of a cached snapshot that may predate
   * this field. A path that skips it silently reintroduces the bug.
   */
  token: string;
  /**
   * Array of installed versions, same shape as for formulae.
   * `brew outdated --json=v2` returns an array for casks; this was previously
   * (incorrectly) declared as a string.
   */
  installed_versions: string[];
  pinned_version?: string;
  pinned: boolean;
}

/// Result Types

export interface InstallableResults {
  formulae: Formula[];
  casks: Cask[];
  /**
   * How many matched IN TOTAL, before a search limit truncated the arrays
   * above. A plain field rather than the `totalLength` expando the arrays also
   * carry: `useCachedPromise` persists through `JSON.stringify`, which keeps
   * array ELEMENTS and silently drops extra array properties — so a result
   * served from the cache had no totals at all, and the list believed it was
   * showing everything.
   *
   * Absent on installed results, which are never truncated.
   */
  totals?: { formulae: number; casks: number };
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
  /**
   * Shrink a record before it is written to a chunk — the hook for a field
   * worth reading but not worth storing whole (see `compactCaskArtifacts`).
   * Runs on a freshly parsed object, so it may mutate in place.
   */
  compact?: (item: T) => T;
}
