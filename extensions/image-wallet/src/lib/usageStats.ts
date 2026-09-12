import { LocalStorage } from "@raycast/api";
import { UsageStats } from "../types";

const STORAGE_KEY = "usage-stats";

async function loadUsageStats(): Promise<UsageStats> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as UsageStats;
  } catch {
    return {};
  }
}

// recordUsage and pruneUsageStats each do a read-modify-write of the whole stored value.
// LocalStorage has no atomic update, so two overlapping calls (e.g. a paste and a copy in
// quick succession, or a prune racing a paste) would otherwise clobber one another's change.
// Chaining every mutation through this queue serializes them so each sees the prior one's result.
// Hydrating React state must use the same queue: an unlocked getItem can resolve after a
// mutation has already called setUsage, and that stale snapshot would revert Recently Used
// / Most Used ordering.
let mutationQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(mutate: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(mutate, mutate);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function readUsageStats(): Promise<UsageStats> {
  return withLock(() => loadUsageStats());
}

export function recordUsage(path: string): Promise<UsageStats> {
  return withLock(async () => {
    const stats = await loadUsageStats();
    const previous = stats[path];

    stats[path] = {
      count: (previous?.count ?? 0) + 1,
      lastUsedAt: Date.now(),
    };

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    return stats;
  });
}

// Drops entries for Cards that no longer exist (moved, renamed, or deleted), so stats don't
// grow unbounded and stale paths don't skew "Recently Used" / "Most Used" sorting.
export function pruneUsageStats(validPaths: ReadonlySet<string>): Promise<UsageStats> {
  return withLock(async () => {
    const stats = await loadUsageStats();
    const pruned: UsageStats = {};
    let changed = false;

    for (const [path, entry] of Object.entries(stats)) {
      if (validPaths.has(path)) {
        pruned[path] = entry;
      } else {
        changed = true;
      }
    }

    if (!changed) return stats;

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    return pruned;
  });
}
