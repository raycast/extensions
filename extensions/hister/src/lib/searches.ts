import { LocalStorage } from "@raycast/api";
import { RecentSearch } from "../api";

/** Kept in Raycast to catch the searches Hister's history misses. */
export type LocalSearches = { recent: RecentSearch[]; pinned: string[]; hidden: Record<string, number> };

const keys = { recent: "recentSearches", pinned: "pinnedSearches", hidden: "hiddenSearches" };

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getLocalSearches(): Promise<LocalSearches> {
  const [recent, pinned, hidden] = await Promise.all([
    read<RecentSearch[]>(keys.recent, []),
    read<string[]>(keys.pinned, []),
    read<Record<string, number>>(keys.hidden, {}),
  ]);
  return { recent, pinned, hidden };
}

// Writes re-read storage so one from a stale render can't drop entries saved since.
export async function saveRecentSearch(query: string): Promise<void> {
  const recent = await read<RecentSearch[]>(keys.recent, []);
  const searchedAt = Math.floor(Date.now() / 1000);
  const next = [{ query, searchedAt }, ...recent.filter((search) => search.query !== query)].slice(0, 100);
  await LocalStorage.setItem(keys.recent, JSON.stringify(next));
}

export async function togglePinnedSearch(query: string): Promise<void> {
  const pinned = await read<string[]>(keys.pinned, []);
  const next = pinned.includes(query) ? pinned.filter((saved) => saved !== query) : [...pinned, query];
  await LocalStorage.setItem(keys.pinned, JSON.stringify(next));
}

/** Keyed to when each search was last used, so one used again shows up again. */
export async function hideRecentSearches(searches: RecentSearch[]): Promise<void> {
  const hidden = await read<Record<string, number>>(keys.hidden, {});
  const next = { ...hidden, ...Object.fromEntries(searches.map((search) => [search.query, search.searchedAt])) };
  await LocalStorage.setItem(keys.hidden, JSON.stringify(next));
}

export function mergeRecentSearches(searches: RecentSearch[]): RecentSearch[] {
  const latest = new Map<string, number>();
  for (const { query, searchedAt } of searches) latest.set(query, Math.max(latest.get(query) ?? 0, searchedAt));
  return [...latest].map(([query, searchedAt]) => ({ query, searchedAt })).sort((a, b) => b.searchedAt - a.searchedAt);
}
