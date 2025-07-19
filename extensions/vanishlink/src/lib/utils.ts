import { LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import type { BookmarkItem } from "./types";

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
