import fs from "node:fs/promises";
import path from "node:path";
import { NOISE_SEGMENTS, SHORTCUT_TARGETS } from "./read-dir";
import { matchPath, ParsedQuery } from "./query";

/** True for Google Drive shared folders that Spotlight cannot index. */
export function isUnindexedScope(dir: string): boolean {
  return dir.includes(`${path.sep}${SHORTCUT_TARGETS}${path.sep}`);
}

export type WalkResult = {
  paths: string[];
  /** True if a limit or the time budget cut the walk short. */
  truncated: boolean;
  error?: string;
};

type Options = {
  showHidden?: boolean;
  maxDepth?: number;
  limit?: number;
  /** Wall-clock ceiling. These mounts are network-backed and can be very slow. */
  budgetMs?: number;
  isCancelled?: () => boolean;
};

/** Number of directories read concurrently. */
const CONCURRENCY = 8;

/** Searches an unindexed tree breadth-first within depth, count, and time bounds. */
export async function walkSearch(
  root: string,
  parsed: ParsedQuery,
  opts: Options = {},
): Promise<WalkResult> {
  const {
    showHidden = false,
    maxDepth = 6,
    limit = 200,
    budgetMs = 8000,
    isCancelled,
  } = opts;

  if (parsed.tokens.length === 0) return { paths: [], truncated: false };

  const deadline = Date.now() + budgetMs;
  const paths: string[] = [];
  let level = [root];
  let truncated = false;
  let readFailed = false;
  const result = (wasTruncated: boolean): WalkResult => ({
    paths: paths.slice(0, limit),
    truncated: wasTruncated,
    error: readFailed ? "Folder search failed" : undefined,
  });

  for (let depth = 0; depth <= maxDepth && level.length > 0; depth++) {
    const next: string[] = [];

    for (let i = 0; i < level.length; i += CONCURRENCY) {
      if (isCancelled?.()) return result(true);
      if (Date.now() > deadline || paths.length >= limit) {
        return result(true);
      }

      const batch = level.slice(i, i + CONCURRENCY);
      const listings = await Promise.all(
        batch.map(async (dir) => {
          try {
            return {
              dir,
              entries: await fs.readdir(dir, { withFileTypes: true }),
            };
          } catch {
            return { dir, entries: [], failed: true };
          }
        }),
      );

      for (const { dir, entries, failed = false } of listings) {
        readFailed ||= failed;
        for (const entry of entries) {
          if (!showHidden && entry.name.startsWith(".")) continue;
          if (NOISE_SEGMENTS.has(entry.name)) continue;

          const full = path.join(dir, entry.name);
          if (matchPath(parsed, full) !== undefined) {
            paths.push(full);
            if (paths.length >= limit) truncated = true;
          }
          // Do not follow symlinks; the shortcut index handles them separately.
          if (entry.isDirectory()) next.push(full);
        }
      }
    }

    level = next;
  }

  return result(truncated || level.length > 0);
}

/** Lists bounded descendants for path-aware filtering by the caller. */
export async function listUnder(
  roots: string[],
  opts: Options = {},
): Promise<WalkResult> {
  const {
    showHidden = false,
    maxDepth = 5,
    limit = 20_000,
    budgetMs = 2000,
    isCancelled,
  } = opts;

  if (roots.length === 0) return { paths: [], truncated: false };

  const deadline = Date.now() + budgetMs;
  const paths: string[] = [];
  let level = roots;
  let readFailed = false;
  const result = (truncated: boolean): WalkResult => ({
    paths: paths.slice(0, limit),
    truncated,
    error: readFailed ? "Folder search failed" : undefined,
  });

  for (let depth = 0; depth <= maxDepth && level.length > 0; depth++) {
    const next: string[] = [];

    for (let i = 0; i < level.length; i += CONCURRENCY) {
      if (isCancelled?.()) return result(true);
      if (Date.now() > deadline || paths.length >= limit) {
        return result(true);
      }

      const batch = level.slice(i, i + CONCURRENCY);
      const listings = await Promise.all(
        batch.map(async (dir) => {
          try {
            return {
              dir,
              entries: await fs.readdir(dir, { withFileTypes: true }),
            };
          } catch {
            return { dir, entries: [], failed: true };
          }
        }),
      );

      for (const { dir, entries, failed = false } of listings) {
        readFailed ||= failed;
        for (const entry of entries) {
          if (!showHidden && entry.name.startsWith(".")) continue;
          if (NOISE_SEGMENTS.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          paths.push(full);
          if (entry.isDirectory()) next.push(full);
        }
      }
    }

    level = next;
  }

  return result(paths.length > limit || level.length > 0);
}
