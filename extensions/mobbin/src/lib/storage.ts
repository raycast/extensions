import { LocalStorage } from "@raycast/api";
import type {
  FavoriteScreen,
  Screen,
  SearchHistoryEntry,
  SearchOptions,
} from "./types";

const HISTORY_KEY = "mobbin.searchHistory";
const FAVORITES_KEY = "mobbin.favorites";
const MAX_HISTORY_ENTRIES = 20;

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  return parseJson(await LocalStorage.getItem<string>(HISTORY_KEY), []);
}

export async function addSearchHistory(options: SearchOptions): Promise<void> {
  const query = options.query.trim();
  if (!query) return;

  const history = await getSearchHistory();
  const entry: SearchHistoryEntry = {
    id: `${Date.now()}-${query}`,
    query,
    platform: options.platform,
    mode: options.mode,
    image_quality: options.image_quality,
    limit: options.limit,
    createdAt: new Date().toISOString(),
  };

  const next = [entry, ...history.filter((item) => item.query !== query)].slice(
    0,
    MAX_HISTORY_ENTRIES,
  );
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function getFavorites(): Promise<FavoriteScreen[]> {
  return parseJson(await LocalStorage.getItem<string>(FAVORITES_KEY), []);
}

export async function isFavorite(screenId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((screen) => screen.id === screenId);
}

export async function toggleFavorite(screen: Screen): Promise<boolean> {
  const favorites = await getFavorites();
  const exists = favorites.some((favorite) => favorite.id === screen.id);
  const next = exists
    ? favorites.filter((favorite) => favorite.id !== screen.id)
    : [{ ...screen, favoritedAt: new Date().toISOString() }, ...favorites];

  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !exists;
}
