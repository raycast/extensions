import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findFd, describeFdLookup, FdLookup } from "./fd";
import {
  openIndexForWrite,
  resumeFtsSync,
  suspendFtsSync,
  writeLastDuration,
} from "./index-db";
import {
  ScanProgress,
  ScanReport,
  describeScan,
  normalizeRoots,
  scanRoots,
} from "./index-scan";
import { closeIndexReader } from "./index-reader";
import {
  DEFAULT_SETTINGS,
  IndexSettings,
  configuredRoots,
} from "./index-settings";

/**
 * Rebuilding the index.
 *
 * Manual only. Nothing here is scheduled, so a scan runs when the user asks and
 * at no other time.
 *
 * The exclusion lock is injected rather than imported: it is the same lock that
 * keeps index rebuilding and data deletion apart. Passing it keeps this module free of `@raycast/api`
 * so the harness can exercise the orchestration directly. See index-rebuild.ts
 * for the wiring the commands use.
 */

/** Serialises index writes and deletion. Returns undefined when busy. */
export type ExclusionLock = <T>(
  work: (assertOwned: () => void) => Promise<T>,
) => Promise<T | undefined>;

/** Default ceiling for a whole rebuild. An fd crawl of one Drive took ~189s. */
export const REBUILD_BUDGET_MS = 900_000;

export type BuildOutcome =
  | { kind: "done"; report: ScanReport; summary: string }
  | { kind: "no-fd"; message: string }
  | { kind: "no-roots"; message: string }
  | { kind: "failed"; message: string };

/**
 * Locally mounted Google Drive accounts.
 *
 * Detected rather than configured: the account name is part of the directory
 * name, so hardcoding one would only ever work on one Mac. Presence of
 * `.shortcut-targets-by-id` is deliberately *not* required here — a Drive with
 * no shared folders is still worth indexing.
 */
export async function googleDriveIndexRoots(
  cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
): Promise<string[]> {
  let entries;
  try {
    entries = await fsp.readdir(cloudRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const roots: string[] = [];
  for (const entry of entries) {
    if (!entry.name.startsWith("GoogleDrive")) continue;
    const full = path.join(cloudRoot, entry.name);
    try {
      // A mount that has gone away leaves the directory entry behind.
      if ((await fsp.stat(full)).isDirectory()) roots.push(full);
    } catch {
      continue;
    }
  }
  return normalizeRoots(roots);
}

export type BuildOptions = {
  /** Where the index lives. Supplied by the caller that knows the support path. */
  file: string;
  withLock: ExclusionLock;
  signal?: AbortSignal;
  budgetMs?: number;
  maxEntries?: number;
  showHidden?: boolean;
  /** Respect .gitignore, .ignore and .fdignore found while scanning. */
  useIgnoreFiles?: boolean;
  /** User exclusion globs, added to the built-in list. */
  patterns?: readonly string[];
  onProgress?: (progress: ScanProgress) => void;
  /** Called before the blocking final write, so the caller can say so. */
  onFinishing?: () => void;
  fdPreference?: string;
  /**
   * Explicit roots. When absent, the configured scopes are combined with the
   * detected Google Drive mounts.
   */
  roots?: string[];
  /** Injection point for tests; defaults to reading the saved settings. */
  loadSettings?: () => Promise<IndexSettings>;
  lookupFd?: (preference?: string) => FdLookup;
  /** Injection point for tests; defaults to spawning fd. */
  spawnFd?: (args: string[], signal?: AbortSignal) => AsyncIterable<Buffer>;
};

/**
 * Scan every configured root into the index.
 *
 * Refresh semantics are enforced in `scanRoot`: a root that fd walked to the
 * end replaces its own coverage and drops stale rows; a root that stopped early
 * merges; a root that could not be read is left exactly as it was. One root
 * failing never affects another's saved coverage.
 */
export async function rebuildIndex(
  options: BuildOptions,
): Promise<BuildOutcome> {
  return captureBuildFailure(() => buildIndex(options));
}

/** Return failures as data before the UI lock wrapper can swallow them. */
async function captureBuildFailure(
  work: () => Promise<BuildOutcome>,
): Promise<BuildOutcome> {
  try {
    return await work();
  } catch (error) {
    return {
      kind: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function buildIndex(options: BuildOptions): Promise<BuildOutcome> {
  const lookup = (options.lookupFd ?? findFd)(options.fdPreference);
  if (lookup.kind !== "found")
    return { kind: "no-fd", message: describeFdLookup(lookup) ?? "" };

  const settings = options.loadSettings
    ? await options.loadSettings()
    : DEFAULT_SETTINGS;
  const roots =
    options.roots ?? configuredRoots(settings, await googleDriveIndexRoots());
  if (roots.length === 0)
    return {
      kind: "no-roots",
      message: settings.includeDrive
        ? "No locally mounted Google Drive was found under ~/Library/CloudStorage. " +
          "Open Google Drive and let it mount, or add a folder in Search Index Settings."
        : "Nothing is set to be indexed. Add a folder in Search Index Settings, " +
          "or turn Google Drive back on there.",
    };

  const outcome = await options.withLock((assertOwned) =>
    captureBuildFailure(async () => {
      const opened = openIndexForWrite(options.file);
      if (opened.kind !== "opened")
        return {
          kind: "failed" as const,
          message:
            opened.kind === "failed"
              ? `The search index could not be opened: ${opened.error}`
              : "The search index could not be created.",
        };

      // Row-by-row FTS maintenance is the largest cost in a scan. Suspend it for
      // the duration and rebuild once, in a finally so a failed or cancelled
      // scan cannot leave the index permanently out of step.
      try {
        assertOwned();
        suspendFtsSync(opened.db);
        const report = await scanRoots({
          fd: lookup.path,
          roots,
          db: opened.db,
          signal: options.signal,
          budgetMs: options.budgetMs ?? REBUILD_BUDGET_MS,
          maxEntries: options.maxEntries,
          showHidden: options.showHidden ?? settings.includeHidden,
          useIgnoreFiles: options.useIgnoreFiles ?? settings.useIgnoreFiles,
          patterns: options.patterns ?? settings.patterns,
          onProgress: options.onProgress,
          spawnFd: options.spawnFd,
          assertOwned,
        });
        try {
          writeLastDuration(opened.db, report.elapsedMs);
        } catch {
          /* A missing duration only affects the stats line. */
        }
        return {
          kind: "done" as const,
          report,
          summary: describeScan(report),
        };
      } finally {
        try {
          /*
           * Rebuilding the FTS index blocks the event loop: 2.7s over 900,000
           * rows. Nothing can repaint during it, so say what is happening and
           * yield once first, or the last progress message sits there looking
           * stalled.
           */
          options.onFinishing?.();
          await new Promise((resolve) => setTimeout(resolve, 0));
          assertOwned();
          resumeFtsSync(opened.db);
        } finally {
          try {
            opened.db.close();
          } finally {
            // The reader may hold a snapshot from before this scan.
            closeIndexReader();
          }
        }
      }
    }),
  );

  return (
    outcome ?? {
      kind: "failed",
      message:
        "Another indexing or deletion run is active. Try again once it finishes.",
    }
  );
}
