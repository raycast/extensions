import { LocalStorage } from "@raycast/api";

const COUNTS_KEY = "ticktick_menu_bar_counts";

export interface CachedTaskCounts {
  overdue: number;
  urgent: number;
  updatedAt: number;
}

export async function getCachedTaskCounts(): Promise<CachedTaskCounts> {
  const raw = await LocalStorage.getItem<string>(COUNTS_KEY);
  if (!raw) return { overdue: 0, urgent: 0, updatedAt: 0 };
  try {
    return JSON.parse(raw) as CachedTaskCounts;
  } catch {
    return { overdue: 0, urgent: 0, updatedAt: 0 };
  }
}

export async function setCachedTaskCounts(counts: Omit<CachedTaskCounts, "updatedAt">): Promise<void> {
  await LocalStorage.setItem(COUNTS_KEY, JSON.stringify({ ...counts, updatedAt: Date.now() }));
}

export async function clearCachedTaskCounts(): Promise<void> {
  await LocalStorage.removeItem(COUNTS_KEY);
}
