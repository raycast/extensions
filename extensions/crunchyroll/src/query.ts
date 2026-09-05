import { QueryClient } from "@tanstack/react-query";
import { LocalStorage } from "@raycast/api";
import { AnimeSeries, searchAnime } from "./crunchyroll-api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes
      gcTime: 1000 * 60 * 60, // 1 hour in cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const HISTORY_QUERIES = [
  "demon slayer",
  "one piece",
  "naruto",
  "attack on titan",
  "jujutsu kaisen",
  "solo leveling",
  "chainsaw man",
  "frieren",
];

const TRENDING_QUERIES = [
  "solo leveling",
  "frieren",
  "chainsaw man",
  "spy x family",
  "one punch man",
  "my hero academia",
  "vinland saga",
  "mushoku tensei",
];

// Cache keys
export const historyKey = ["crunchyroll", "history"];
export const trendingKey = ["crunchyroll", "trending"];

// Cache to LocalStorage for instant load on next launch
async function cacheToStorage(
  key: string,
  items: AnimeSeries[],
): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(items));
    await LocalStorage.setItem(`${key}-time`, Date.now().toString());
  } catch {
    // ignore
  }
}

async function loadFromStorage(key: string): Promise<AnimeSeries[] | null> {
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (!cached) return null;
    return JSON.parse(cached) as AnimeSeries[];
  } catch {
    return null;
  }
}

// Fetcher: search multiple queries in parallel, dedupe, cache to LocalStorage
async function fetchAnimeList(
  queries: string[],
  storageKey: string,
): Promise<AnimeSeries[]> {
  const allResults = await Promise.all(
    queries.map((q) => searchAnime(q).catch(() => [] as AnimeSeries[])),
  );

  const allAnime: AnimeSeries[] = [];
  const seen = new Set<string>();
  for (const res of allResults) {
    if (res.length > 0 && !seen.has(res[0].id)) {
      seen.add(res[0].id);
      allAnime.push(res[0]);
    }
  }

  await cacheToStorage(storageKey, allAnime);
  return allAnime;
}

export async function fetchHistory(): Promise<AnimeSeries[]> {
  return fetchAnimeList(HISTORY_QUERIES, "crunchyroll-history-cache");
}

export async function fetchTrending(): Promise<AnimeSeries[]> {
  return fetchAnimeList(TRENDING_QUERIES, "crunchyroll-trending-cache");
}

export async function getHistoryFromCache(): Promise<AnimeSeries[] | null> {
  return loadFromStorage("crunchyroll-history-cache");
}

export async function getTrendingFromCache(): Promise<AnimeSeries[] | null> {
  return loadFromStorage("crunchyroll-trending-cache");
}
