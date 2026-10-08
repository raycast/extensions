import { LocalStorage } from "@raycast/api";

const FAVORITES_KEY = "favorite-session-ids";
const RECENTS_KEY = "recent-session-ids";
const MAX_RECENTS = 20;

export async function getFavoriteSessionIds(): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export async function setFavoriteSessionIds(ids: string[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export async function toggleFavoriteSessionId(sessionId: string): Promise<string[]> {
  const favorites = await getFavoriteSessionIds();
  const nextFavorites = favorites.includes(sessionId)
    ? favorites.filter((id) => id !== sessionId)
    : [sessionId, ...favorites];

  await setFavoriteSessionIds(nextFavorites);
  return nextFavorites;
}

export async function getRecentSessionIds(): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export async function touchRecentSessionId(sessionId: string): Promise<string[]> {
  const recents = await getRecentSessionIds();
  const nextRecents = [sessionId, ...recents.filter((id) => id !== sessionId)].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(nextRecents));
  return nextRecents;
}
