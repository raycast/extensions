import { LocalStorage } from "@raycast/api";
import { Profile, ProfileCache } from "./types";

const PROFILES_CACHE_KEY = "profiles-cache";
const FAVORITES_KEY = "favorite-profiles";

export async function getCachedProfiles(): Promise<ProfileCache | null> {
  const raw = await LocalStorage.getItem<string>(PROFILES_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileCache;
  } catch {
    return null;
  }
}

export async function setCachedProfiles(profiles: Profile[]): Promise<void> {
  const cache: ProfileCache = {
    profiles,
    scannedAt: new Date().toISOString(),
  };
  await LocalStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(cache));
}

export async function getFavorites(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function setFavorites(ids: string[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}
