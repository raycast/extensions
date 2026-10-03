import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findFd, describeFdLookup, FdLookup } from "./fd";
import {
  openIndexForWrite,
  readIndexRoots,
  resumeFtsSync,
  suspendFtsSync,
  writeScanStarted,
  writeScanEnded,
} from "./index-db";
import {
  ScanProgress,
  ScanReport,
  ScanTuning,
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
import type { ParsedIndexSettings } from "./index-settings";
import { createReadPool } from "./bounded-reads";

/**
 * Rebuilding the index.
 *
 * Manual only. Nothing here is scheduled, so a scan runs when the user asks and
 * at no other time.
 *
 * The exclusion lock is injected rather than imported: it is the same lock that
 * keeps rebuilding, settings changes, and data deletion apart. Passing it keeps
 * this module free of `@raycast/api` so the harness can exercise the
 * orchestration directly. See index-rebuild.ts for the wiring the commands use.
 */

/** Serialises index writes, settings changes, and deletion. Undefined when busy. */
export type ExclusionLock = <T>(
  work: (assertOwned: () => void) => Promise<T>,
) => Promise<T | undefined>;

/** Default ceiling for a whole rebuild. One large mounted cloud crawl took ~189s. */
export const REBUILD_BUDGET_MS = 900_000;

export type BuildOutcome =
  | { kind: "done"; report: ScanReport; summary: string }
  | { kind: "no-fd"; message: string }
  | { kind: "no-roots"; message: string }
  | { kind: "failed"; message: string };

/**
 * All locally mounted provider folders under CloudStorage.
 *
 * Provider and account names vary; only the internal .locator folder is skipped.
 * Directory entries are kept even when the provider is temporarily unavailable:
 * the scan can then preserve its saved coverage instead of mistaking it for a
 * provider the user removed. stat follows usable links and still skips files.
 */
export type CloudStorageRootResult = {
  roots: string[];
  /** False when provider discovery failed, timed out, or stopped early. */
  authoritative: boolean;
};

const cloudDiscoveryRead = createReadPool(8);
const CLOUD_DISCOVERY_BUDGET_MS = 3000;

export async function cloudStorageIndexRootResult(
  cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
  options: { signal?: AbortSignal; budgetMs?: number } = {},
): Promise<CloudStorageRootResult> {
  const active = new AbortController();
  const stop = () => active.abort();
  options.signal?.addEventListener("abort", stop, { once: true });
  if (options.signal?.aborted) stop();
  const timer = setTimeout(stop, options.budgetMs ?? CLOUD_DISCOVERY_BUDGET_MS);
  try {
    let entries;
    try {
      entries = await cloudDiscoveryRead(
        `cloud-roots:${cloudRoot}`,
        () => fsp.readdir(cloudRoot, { withFileTypes: true }),
        active.signal,
      );
    } catch {
      return { roots: [], authoritative: false };
    }
    const roots: string[] = [];
    for (const entry of entries) {
      if (active.signal.aborted)
        return { roots: normalizeRoots(roots), authoritative: false };
      if (entry.name === ".locator") continue;
      const full = path.join(cloudRoot, entry.name);
      if (entry.isDirectory()) {
        roots.push(full);
        continue;
      }
      try {
        // Follow links when possible so links to ordinary files remain excluded.
        const stats = await cloudDiscoveryRead(
          `cloud-root-stat:${full}`,
          () => fsp.stat(full),
          active.signal,
        );
        if (stats.isDirectory()) roots.push(full);
      } catch {
        // A provider can leave a directory link behind while temporarily
        // unmounted. Keep that scope: scanRoot will report it unavailable and a
        // complete scan of the other roots will not erase its saved rows.
        if (entry.isSymbolicLink()) roots.push(full);
      }
    }
    return {
      roots: normalizeRoots(roots),
      authoritative: !active.signal.aborted,
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", stop);
  }
}

/** Root-only compatibility wrapper for the settings screen and tests. */
export async function cloudStorageIndexRoots(
  cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
): Promise<string[]> {
  return (await cloudStorageIndexRootResult(cloudRoot)).roots;
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
   * detected CloudStorage folders.
   */
  roots?: string[];
  /** Injection point for tests; defaults to reading the saved settings. */
  loadSettings?: () => Promise<IndexSettings>;
  /** Production loader that also says whether cleanup is safe. */
  loadSettingsResult?: () => Promise<ParsedIndexSettings>;
  /** Test seam for bounded provider discovery. */
  discoverCloudRoots?: () => Promise<CloudStorageRootResult>;
  lookupFd?: (preference?: string) => FdLookup | Promise<FdLookup>;
  /** Injection point for tests; defaults to spawning fd. */
  spawnFd?: (args: string[], signal?: AbortSignal) => AsyncIterable<Buffer>;
  /** Benchmark-only overrides; normal rebuilds use the production defaults. */
  tuning?: ScanTuning;
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
  const outcome = await options.withLock((assertOwned) =>
    captureBuildFailure(async () => {
      // The automatic download is also serialized by this lock, so concurrent
      // rebuild commands cannot install over one another.
      const lookup = await (options.lookupFd ?? findFd)(options.fdPreference);
      if (lookup.kind !== "found")
        return { kind: "no-fd", message: describeFdLookup(lookup) ?? "" };

      // Settings saves hold this same lock. Read only after acquisition so
      // complete-scan cleanup uses a configuration that cannot change mid-run.
      const loaded = options.loadSettingsResult
        ? await options.loadSettingsResult()
        : {
            settings: options.loadSettings
              ? await options.loadSettings()
              : DEFAULT_SETTINGS,
            authoritative: true,
          };
      const settings = loaded.settings;
      const cloud = options.roots
        ? { roots: [] as string[], authoritative: true }
        : settings.includeDrive
          ? await (options.discoverCloudRoots
              ? options.discoverCloudRoots()
              : cloudStorageIndexRootResult(undefined, {
                  signal: options.signal,
                }))
          : { roots: [] as string[], authoritative: true };
      const roots = options.roots ?? configuredRoots(settings, cloud.roots);
      const cleanupAuthoritative = loaded.authoritative && cloud.authoritative;
      if (roots.length === 0)
        return {
          kind: "no-roots",
          message:
            settings.includeDrive && !cloud.authoritative
              ? "Cloud folders could not be read. Open your cloud provider and retry; saved index results were kept."
              : settings.includeDrive
                ? "No cloud folders were found under ~/Library/CloudStorage. " +
                  "Open your cloud provider and let it mount, or add a folder in Search Index Settings."
                : "Nothing is set to be indexed. Add a folder in Search Index Settings, " +
                  "or turn Include Cloud Storage back on there.",
        };

      assertOwned();
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
      const startedAt = Date.now();
      let report: ScanReport | undefined;
      try {
        assertOwned();
        writeScanStarted(opened.db, startedAt);
        suspendFtsSync(opened.db);
        report = await scanRoots({
          fd: lookup.path,
          roots,
          db: opened.db,
          signal: options.signal,
          budgetMs: options.budgetMs ?? REBUILD_BUDGET_MS,
          maxEntries: options.maxEntries,
          showHidden: options.showHidden ?? settings.includeHidden,
          useIgnoreFiles: options.useIgnoreFiles ?? settings.useIgnoreFiles,
          patterns: options.patterns ?? settings.patterns,
          allowRootCleanup: cleanupAuthoritative,
          protectedRoots: cleanupAuthoritative
            ? []
            : readIndexRoots(opened.db).map((entry) => entry.root),
          onProgress: options.onProgress,
          spawnFd: options.spawnFd,
          assertOwned,
          tuning: options.tuning,
        });
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
          // UI feedback must never be able to skip the integrity repair below.
          try {
            options.onFinishing?.();
          } catch {
            /* The index is more important than optional progress feedback. */
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
          assertOwned();
          const ftsStarted = performance.now();
          resumeFtsSync(opened.db);
          if (report !== undefined)
            report.timings.ftsMs = performance.now() - ftsStarted;
          writeScanEnded(opened.db, startedAt, Date.now());
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
        "Another indexing, settings, or deletion operation is active. Try again once it finishes.",
    }
  );
}
