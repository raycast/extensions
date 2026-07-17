import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import type { BookmarkItem } from "./types";
import { getExpiryDays } from "./is-expired";
import { TIME_CONSTANTS } from "./constants";

export function getRemainingMilisecond(lastAccessedAt: number, now: number = Date.now()): { millisecond: number } {
  const preferences = getPreferenceValues<Preferences>();
  const expiredDays = getExpiryDays(preferences);

  const expirationTime = lastAccessedAt + expiredDays * TIME_CONSTANTS.ONE_DAY_MS;
  const remainingMs = expirationTime - now;

  return {
    millisecond: remainingMs,
  };
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export async function updateLastAccessed(id: string): Promise<void> {
  const bookmarkJson = await LocalStorage.getItem<string>(id);

  if (bookmarkJson) {
    const bookmark: BookmarkItem = JSON.parse(bookmarkJson);
    bookmark.lastAccessedAt = Date.now();
    await LocalStorage.setItem(id, JSON.stringify(bookmark));
  }
}

export function generateId(url: string): string {
  const hash = createHash("md5").update(url).digest("hex");
  return hash;
}
