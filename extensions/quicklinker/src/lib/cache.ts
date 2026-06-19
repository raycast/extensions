import { LocalStorage } from "@raycast/api";
import {
  CACHE_KEY,
  CACHE_TTL_MS,
  CachedShortcuts,
  CacheState,
  Shortcut,
} from "./types";

export async function getCacheState(): Promise<CacheState> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) {
    return { status: "miss" };
  }

  try {
    const cached: CachedShortcuts = JSON.parse(raw);

    if (
      !cached ||
      !Array.isArray(cached.shortcuts) ||
      typeof cached.fetchedAt !== "number"
    ) {
      await LocalStorage.removeItem(CACHE_KEY);
      return { status: "miss" };
    }

    const age = Date.now() - cached.fetchedAt;
    if (age < CACHE_TTL_MS) {
      return { status: "fresh", shortcuts: cached.shortcuts };
    } else {
      return { status: "stale", shortcuts: cached.shortcuts };
    }
  } catch {
    await LocalStorage.removeItem(CACHE_KEY);
    return { status: "miss" };
  }
}

export async function setCache(shortcuts: Shortcut[]): Promise<void> {
  const entry: CachedShortcuts = {
    shortcuts,
    fetchedAt: Date.now(),
  };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

export async function clearCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
}
