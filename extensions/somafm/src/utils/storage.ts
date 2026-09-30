import { LocalStorage } from "@raycast/api";

export interface StorageSchema {
  favorites: string[]; // Array of station IDs
  recentlyPlayed: RecentItem[];
}

export interface RecentItem {
  stationId: string;
  playedAt: string; // ISO date string
}

const STORAGE_KEYS = {
  FAVORITES: "somafm-favorites",
  RECENTLY_PLAYED: "somafm-recently-played",
} as const;

// Utility function for safe JSON parsing
async function safeParseJSON<T>(key: string, defaultValue: T): Promise<T> {
  const stored = await LocalStorage.getItem<string>(key);
  if (!stored) return defaultValue;

  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

// Favorites functions
export async function getFavorites(): Promise<string[]> {
  return safeParseJSON(STORAGE_KEYS.FAVORITES, []);
}

export async function addFavorite(stationId: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(stationId)) {
    favorites.push(stationId);
    await LocalStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }
}

export async function removeFavorite(stationId: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((id) => id !== stationId);
  await LocalStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
}

export async function toggleFavorite(stationId: string): Promise<boolean> {
  const favorites = await getFavorites();
  if (favorites.includes(stationId)) {
    await removeFavorite(stationId);
    return false;
  } else {
    await addFavorite(stationId);
    return true;
  }
}

// Recently played functions
export async function getRecentlyPlayed(): Promise<RecentItem[]> {
  return safeParseJSON(STORAGE_KEYS.RECENTLY_PLAYED, []);
}

export async function addToRecentlyPlayed(stationId: string): Promise<void> {
  const recent = await getRecentlyPlayed();

  // Remove if already exists
  const filtered = recent.filter((item) => item.stationId !== stationId);

  // Add to beginning
  filtered.unshift({
    stationId,
    playedAt: new Date().toISOString(),
  });

  // Keep only 5 most recent
  const trimmed = filtered.slice(0, 5);

  await LocalStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(trimmed));
}

export async function clearRecentlyPlayed(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify([]));
}
