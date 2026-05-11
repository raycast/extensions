import { LocalStorage } from "@raycast/api";
import type { BookmarkItem } from "./types";

export async function saveBookmark(bookmark: BookmarkItem): Promise<void> {
  // Validate data
  if (!bookmark.url || !bookmark.title) {
    throw new Error("Invalid bookmark data: missing required fields");
  }

  if (typeof bookmark.createdAt !== "number" || typeof bookmark.lastAccessedAt !== "number") {
    throw new Error("Invalid bookmark data: timestamps must be numbers");
  }

  console.debug("Saving bookmark:", bookmark);

  // Check if bookmark with same ID already exists
  const existingBookmarkJson = await LocalStorage.getItem<string>(bookmark.id);

  if (existingBookmarkJson) {
    throw new Error("This URL is already bookmarked");
  }

  // Save bookmark data
  const bookmarkJson = JSON.stringify(bookmark);
  await LocalStorage.setItem(bookmark.id, bookmarkJson);

  console.debug("Bookmark saved successfully");
}
