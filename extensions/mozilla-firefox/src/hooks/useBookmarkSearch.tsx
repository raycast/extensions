import { useEffect, useState } from "react";
import { HistoryEntry, Tab } from "../interfaces";
import fs from "fs";
import { getBookmarksDirectoryPath } from "../util";
import { decodeLZ4 } from "../util";

function extractBookmarkFromBookmarkDirectory(bookmarkDirectory: any): HistoryEntry[] {
  const bookmarks: HistoryEntry[] = [];
  if (bookmarkDirectory.type === "text/x-moz-place-container" && bookmarkDirectory.children) {
    bookmarkDirectory.children.forEach((child: any) => {
      const bookmarkEntries = extractBookmarkFromBookmarkDirectory(child);
      bookmarks.push(...bookmarkEntries);
    });
  } else if (bookmarkDirectory.type === "text/x-moz-place" && bookmarkDirectory.uri) {
    bookmarks.push({
      id: bookmarkDirectory.id,
      title: bookmarkDirectory.title,
      url: bookmarkDirectory.uri,
      lastVisited: bookmarkDirectory.dateAdded,
    });
  }
  return bookmarks;
}

function extractBookmarks(): HistoryEntry[] {
  let bookmarksPath = getBookmarksDirectoryPath();
  if (!fs.existsSync(bookmarksPath) || bookmarksPath.length === 0) {
    throw new Error("No bookmark file found.");
  }
  const files = fs.readdirSync(bookmarksPath);
  const fileBuffer = fs.readFileSync(`${bookmarksPath}/${files[files.length - 1]}`);
  const rawBookmarks = decodeLZ4(fileBuffer);

  return extractBookmarkFromBookmarkDirectory(rawBookmarks);
}

export function useBookmarkSearch(query: string | undefined) {
  const [entries, setEntries] = useState<HistoryEntry[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const bookmarks = extractBookmarks();
      if (query) {
        setEntries(
          bookmarks.filter((bookmark) => {
            return (
              bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
              bookmark.url.toLowerCase().includes(query.toLowerCase())
            );
          })
        );
      } else {
        setEntries(bookmarks);
      }
      setIsLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(false);
    }
  }, [query]);

  return { entries, error, isLoading };
}
