import fs from "node:fs/promises";
import path from "node:path";
import { NOISE_SEGMENTS, SHORTCUT_TARGETS } from "./read-dir";
import { matchPath, ParsedQuery } from "./query";
import { createReadPool } from "./bounded-reads";
import { createWorkQueue } from "./work-queue";
import { LIVE_CANDIDATES, LIVE_DIRECTORIES } from "./search-limits";
import { MAX_ENTRIES } from "./read-dir";
import { readBoundedDirectory } from "./bounded-directory";

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
  signal?: AbortSignal;
  continuous?: boolean;
  onBatch?: (paths: string[]) => void | Promise<void>;
  visited?: Set<string>;
};

/** Number of directories read concurrently. */
const CONCURRENCY = 8;
const read = createReadPool(CONCURRENCY);

/** Live traversal keeps collecting within fixed memory bounds, without a time cutoff. */
async function walkLive(
  roots: string[],
  matches: (full: string) => boolean,
  opts: Options,
): Promise<WalkResult> {
  const active = new AbortController();
  const stop = () => active.abort();
  opts.signal?.addEventListener("abort", stop, { once: true });
  if (opts.signal?.aborted) stop();
  const cancelled = () =>
    opts.signal?.aborted || active.signal.aborted || opts.isCancelled?.();
  const paths: string[] = [];
  let failed = false;
  let truncated = false;
  let capacityReached = false;
  let count = 0;
  const limit = Math.min(opts.limit ?? LIVE_CANDIDATES, LIVE_CANDIDATES);
  const visited = opts.visited ?? new Set<string>();
  const enqueue = async (directories: string[]) => {
    const fresh = directories
      .map((dir) => path.resolve(dir))
      .filter((dir) => {
        if (visited.has(dir)) return false;
        if (visited.size >= LIVE_DIRECTORIES) {
          truncated = true;
          return false;
        }
        visited.add(dir);
        return true;
      });
    await queue.push(fresh);
  };
  const queue = createWorkQueue<string>(
    async ([dir]) => {
      if (capacityReached || cancelled()) return;
      try {
        const listing = await read(
          `${dir}:${!!opts.showHidden}`,
          () => readBoundedDirectory(dir, MAX_ENTRIES, !!opts.showHidden),
          active.signal,
        );
        truncated ||= listing.truncated;
        let batch: string[] = [];
        for (const entry of listing.entries) {
          if (cancelled()) return;
          if (capacityReached) break;
          if (
            (!opts.showHidden && entry.name.startsWith(".")) ||
            NOISE_SEGMENTS.has(entry.name)
          )
            continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) await enqueue([full]);
          if (matches(full)) {
            if (count >= limit) {
              truncated = true;
              capacityReached = true;
              break;
            }
            count++;
            batch.push(full);
          }
          if (batch.length === 60) {
            if (opts.onBatch) await opts.onBatch(batch);
            else paths.push(...batch);
            batch = [];
          }
        }
        if (!cancelled() && batch.length > 0) {
          if (opts.onBatch) await opts.onBatch(batch);
          else paths.push(...batch);
        }
      } catch {
        if (!cancelled()) failed = true;
      }
    },
    active.signal,
    { concurrency: CONCURRENCY, maxPending: Infinity },
  );
  try {
    await enqueue(roots);
    await queue.drain();
    return {
      paths,
      truncated: truncated || !!cancelled(),
      error: failed ? "Some folders could not be read" : undefined,
    };
  } finally {
    stop();
    opts.signal?.removeEventListener("abort", stop);
  }
}

/** Searches an unindexed tree breadth-first within depth, count, and time bounds. */
export async function walkSearch(
  root: string,
  parsed: ParsedQuery,
  opts: Options = {},
): Promise<WalkResult> {
  if (opts.continuous)
    return walkLive(
      [root],
      (full) => matchPath(parsed, full) !== undefined,
      opts,
    );
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
  if (opts.continuous) return walkLive(roots, () => true, opts);
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
