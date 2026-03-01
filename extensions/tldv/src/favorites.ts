import { LocalStorage } from "@raycast/api";
import { FavoriteMeeting, Meeting, SearchHistoryItem } from "./types";

const FAVORITES_KEY = "tldv-favorites";
const SEARCH_HISTORY_KEY = "tldv-search-history";
const MAX_SEARCH_HISTORY = 10;

// Favorites Management
export async function getFavorites(): Promise<FavoriteMeeting[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FavoriteMeeting[];
  } catch {
    return [];
  }
}

export async function addFavorite(meeting: Meeting): Promise<void> {
  const favorites = await getFavorites();
  if (favorites.some((f) => f.id === meeting.id)) return;

  favorites.unshift({
    id: meeting.id,
    name: meeting.name,
    url: meeting.url,
    addedAt: new Date().toISOString(),
  });

  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function removeFavorite(meetingId: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((f) => f.id !== meetingId);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

export async function isFavorite(meetingId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => f.id === meetingId);
}

export async function toggleFavorite(meeting: Meeting): Promise<boolean> {
  const isCurrentlyFavorite = await isFavorite(meeting.id);
  if (isCurrentlyFavorite) {
    await removeFavorite(meeting.id);
    return false;
  } else {
    await addFavorite(meeting);
    return true;
  }
}

// Search History Management
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(SEARCH_HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    return [];
  }
}

export async function addSearchHistory(query: string): Promise<void> {
  if (!query.trim()) return;

  const history = await getSearchHistory();

  // Remove duplicate if exists
  const filtered = history.filter(
    (h) => h.query.toLowerCase() !== query.toLowerCase(),
  );

  // Add to front
  filtered.unshift({
    query: query.trim(),
    timestamp: Date.now(),
  });

  // Limit history size
  const limited = filtered.slice(0, MAX_SEARCH_HISTORY);

  await LocalStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limited));
}

export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.removeItem(SEARCH_HISTORY_KEY);
}

export async function removeSearchHistoryItem(query: string): Promise<void> {
  const history = await getSearchHistory();
  const filtered = history.filter((h) => h.query !== query);
  await LocalStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
}
