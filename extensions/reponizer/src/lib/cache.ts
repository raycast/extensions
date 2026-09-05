import { Cache } from "@raycast/api";
import { buildIndex, inspectPath, inspectRepo, markDuplicates } from "./inspect";
import type { Protocol, RepoEntry, RepoIndex } from "./types";
import { mapConcurrent } from "./util";

/** Bump when the RepoIndex/RepoEntry shape changes so stale cached JSON is discarded. */
const CACHE_VERSION = 1;

const cache = new Cache();

function cacheKey(root: string): string {
  return `index:v${CACHE_VERSION}:${root}`;
}

export function readCachedIndex(root: string): RepoIndex | undefined {
  const raw = cache.get(cacheKey(root));
  if (!raw) return undefined;
  try {
    const index = JSON.parse(raw) as RepoIndex;
    return index.root === root && Array.isArray(index.entries) ? index : undefined;
  } catch {
    return undefined;
  }
}

export function writeCachedIndex(index: RepoIndex): void {
  cache.set(cacheKey(index.root), JSON.stringify(index));
}

export function sizesOf(index: RepoIndex): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const entry of index.entries) {
    if (entry.sizeBytes !== undefined) sizes.set(entry.fullPath, entry.sizeBytes);
  }
  return sizes;
}

let indexWriteLock: Promise<unknown> = Promise.resolve();

/**
 * All cache updates go through this gate: it serializes read-modify-write cycles
 * within the process and applies the patch to the freshest cached index rather than
 * the caller's (possibly stale) snapshot. Without it, a slow bulk operation and a
 * per-repo action finishing around the same time would clobber each other's writes.
 */
async function patchFreshIndex(fallback: RepoIndex, patch: (base: RepoIndex) => RepoIndex): Promise<RepoIndex> {
  const run = indexWriteLock.then(() => {
    const base = readCachedIndex(fallback.root) ?? fallback;
    const next = patch(base);
    writeCachedIndex(next);
    return next;
  });
  indexWriteLock = run.catch(() => undefined);
  return run;
}

/** Full rescan; writes the result to the cache. */
export async function rebuildIndex(
  root: string,
  maxDepth: number,
  protocol: Protocol,
  options: { reuseSizesFrom?: RepoIndex; onProgress?: (done: number, total: number) => void } = {},
): Promise<RepoIndex> {
  const index = await buildIndex(root, maxDepth, protocol, {
    previousSizes: options.reuseSizesFrom ? sizesOf(options.reuseSizesFrom) : undefined,
    onProgress: options.onProgress,
  });
  // A full scan is authoritative; it only needs to be serialized, not merged.
  return patchFreshIndex(index, () => index);
}

/** Replace, add, or remove a single entry after an action touched `fullPath`. Writes the cache. */
export async function reconcilePath(index: RepoIndex, fullPath: string, protocol: Protocol): Promise<RepoIndex> {
  const entry = await inspectPath(index.root, fullPath, protocol);
  return patchFreshIndex(index, (base) => {
    const entries = base.entries.filter((e) => e.fullPath !== fullPath);
    if (entry) entries.push(entry);
    entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    markDuplicates(entries);
    return { ...base, entries };
  });
}

/** Re-inspect several existing repo entries (statuses after fetch/pull); keeps sizes. Writes the cache. */
export async function refreshRepoEntries(
  index: RepoIndex,
  fullPaths: string[],
  protocol: Protocol,
): Promise<RepoIndex> {
  const wanted = new Set(fullPaths);
  const updated = new Map<string, RepoEntry>();
  await mapConcurrent([...wanted], 8, async (p) => {
    const fresh = await inspectRepo(index.root, p, protocol);
    fresh.sizeBytes = index.entries.find((e) => e.fullPath === p)?.sizeBytes;
    updated.set(p, fresh);
  });
  return patchFreshIndex(index, (base) => {
    // Entries removed by a concurrent action stay removed: map over the fresh base only.
    const entries = base.entries.map((e) => updated.get(e.fullPath) ?? e);
    markDuplicates(entries);
    return { ...base, entries };
  });
}
