import { readFile } from "fs";
import { promisify } from "util";
import { BookmarkDirectory, HistoryEntry, RawBookmarks } from "../interfaces";
import { getBookmarksFilePath } from "../util";
import { useEffect, useState } from "react";
const fsReadFileAsync = promisify(readFile);

function extractBookmarkFromBookmarkDirectory(bookmarkDirectory: BookmarkDirectory): HistoryEntry[] {
  const bookmarks: HistoryEntry[] = [];
  if (bookmarkDirectory.type === "folder") {
    bookmarkDirectory.children.forEach((child) => {
      bookmarks.push(...extractBookmarkFromBookmarkDirectory(child));
    });
  } else if (bookmarkDirectory.type === "url" && bookmarkDirectory.url) {
    bookmarks.push({
      id: bookmarkDirectory.id,
      url: bookmarkDirectory.url,
      title: bookmarkDirectory.name,
      lastVisited: new Date(bookmarkDirectory.date_added),
    });
  } else {
    Object.values(bookmarkDirectory).forEach((value) => {
      if (typeof value === "object") {
        bookmarks.push(...extractBookmarkFromBookmarkDirectory(value as BookmarkDirectory));
      }
    });
  }
  return bookmarks;
}

const extractBookmarks = (rawBookmarks: RawBookmarks): HistoryEntry[] => {
  const bookmarks: HistoryEntry[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = extractBookmarkFromBookmarkDirectory(rootLevelBookmarkFolders);
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const getBookmarks = async (): Promise<HistoryEntry[]> => {
  const bookmarksFilePath = getBookmarksFilePath();
  const fileBuffer = await fsReadFileAsync(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

export function useBookmarkSearch(query?: string): { error?: string; isLoading: boolean; data: HistoryEntry[] } {
  const [bookmarks, setBookmarks] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getBookmarks()
      .then((bookmarks) => {
        setBookmarks(bookmarks.filter((bookmark) => bookmark.title.toLowerCase().includes(query?.toLowerCase() || "")));
        setIsLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setIsLoading(false);
      });
  }, [query]);

  return { error, isLoading, data: bookmarks };
}
