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
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;
