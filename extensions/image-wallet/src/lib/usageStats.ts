import { LocalStorage } from "@raycast/api";
import { UsageStats } from "../types";

const STORAGE_KEY = "usage-stats";

export async function loadUsageStats(): Promise<UsageStats> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as UsageStats;
  } catch {
    return {};
  }
}

export async function recordUsage(path: string): Promise<UsageStats> {
  const stats = await loadUsageStats();
  const previous = stats[path];

  stats[path] = {
    count: (previous?.count ?? 0) + 1,
    lastUsedAt: Date.now(),
  };

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

// Drops entries for Cards that no longer exist (moved, renamed, or deleted), so stats don't
// grow unbounded and stale paths don't skew "Recently Used" / "Most Used" sorting.
export async function pruneUsageStats(validPaths: ReadonlySet<string>): Promise<UsageStats> {
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
}
