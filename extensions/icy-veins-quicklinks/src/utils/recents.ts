import { LocalStorage } from "@raycast/api";
import type { RecentEntry } from "../types";

const STORAGE_KEY = "recent-guides";
const MAX_RECENTS = 1;

export async function getRecents(): Promise<RecentEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentEntry[];
  } catch {
    return [];
  }
}

export async function addRecent(entry: RecentEntry): Promise<void> {
  const existing = await getRecents();
  const filtered = existing.filter((r) => r.id !== entry.id);
  const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
