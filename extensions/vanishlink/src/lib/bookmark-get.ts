import { LocalStorage } from "@raycast/api";
import { isExpired } from "./is-expired";
import type { BookmarkItem } from "./types";

type RawStorage = Record<string, string>;

export async function getBookmarks(now: number = Date.now()): Promise<BookmarkItem[]> {
  const raw: RawStorage = await LocalStorage.allItems();
  const valid: BookmarkItem[] = [];
  const expiredKeys: string[] = [];

  for (const [key, json] of Object.entries(raw)) {
    try {
      const item: BookmarkItem = JSON.parse(json);

      // validate schema
      if (typeof item.url !== "string" || typeof item.lastAccessedAt !== "number") {
        console.warn(`Invalid bookmark schema in key "${key}"`);
        expiredKeys.push(key);
        continue;
      }

      if (isExpired(item.lastAccessedAt, now)) {
        expiredKeys.push(key);
        continue;
      }

      valid.push(item);
    } catch (e) {
      console.error(`Failed to parse bookmark "${key}":`, e);
      expiredKeys.push(key);
    }
  }

  // delete expired items
  if (expiredKeys.length) {
    await Promise.all(expiredKeys.map((k) => LocalStorage.removeItem(k)));
  }

  valid.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

  return valid;
}
