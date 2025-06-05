import { LocalStorage } from "@raycast/api";
import { SearchResult } from "../search-articles"; // Assuming SearchResult is exported from search-articles.tsx

export interface BookmarkedArticle extends SearchResult {
  savedAt: string;
}

const BOOKMARKS_KEY = "google-scholar-bookmarks";

export async function getBookmarks(): Promise<BookmarkedArticle[]> {
  const bookmarksJson = await LocalStorage.getItem<string>(BOOKMARKS_KEY);
  if (!bookmarksJson) {
    return [];
  }
  try {
    return JSON.parse(bookmarksJson) as BookmarkedArticle[];
  } catch (error) {
    console.error("Failed to parse bookmarks:", error);
    return [];
  }
}

export async function addBookmark(article: SearchResult): Promise<void> {
  const bookmarks = await getBookmarks();
  const now = new Date().toISOString();
  const newBookmark: BookmarkedArticle = { ...article, savedAt: now };

  // Avoid duplicates based on link
  if (!bookmarks.find((b) => b.link === article.link)) {
    bookmarks.push(newBookmark);
    await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

export async function removeBookmark(articleLink: string): Promise<void> {
  let bookmarks = await getBookmarks();
  bookmarks = bookmarks.filter((bookmark) => bookmark.link !== articleLink);
  await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export async function isBookmarked(articleLink: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some((bookmark) => bookmark.link === articleLink);
}

export async function toggleBookmark(article: SearchResult): Promise<boolean> {
  if (await isBookmarked(article.link)) {
    await removeBookmark(article.link);
    return false; // Was bookmarked, now removed
  } else {
    await addBookmark(article);
    return true; // Was not bookmarked, now added
  }
}
