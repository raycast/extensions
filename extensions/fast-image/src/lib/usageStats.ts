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
