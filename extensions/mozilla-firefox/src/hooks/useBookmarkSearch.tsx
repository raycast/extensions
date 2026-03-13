import { promises, existsSync, readdirSync } from "fs";
import { ReactElement, useEffect, useState } from "react";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getBookmarksDirectoryPath, decodeLZ4 } from "../util";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NoBookmarksError, NotInstalledError, UnknownError } from "../components";

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

async function extractBookmarks(): Promise<HistoryEntry[]> {
  const bookmarksPath = getBookmarksDirectoryPath();
  if (!existsSync(bookmarksPath)) {
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }
  const files = readdirSync(bookmarksPath);
  if (files.length === 0) {
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }
  const fileBuffer = await promises.readFile(`${bookmarksPath}/${files[files.length - 1]}`);
  const rawBookmarks = decodeLZ4(fileBuffer);

  return extractBookmarkFromBookmarkDirectory(rawBookmarks);
}

export function useBookmarkSearch(query?: string): SearchResult<HistoryEntry> {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactElement>();

  useEffect(() => {
    extractBookmarks()
      .then((bookmarks) => {
        setData(
          bookmarks.filter(
            (bookmark) =>
              bookmark.title.toLowerCase().includes(query?.toLowerCase() || "") ||
              bookmark.url.toLowerCase().includes(query?.toLowerCase() || "")
          )
        );
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (e.message === NO_BOOKMARKS_MESSAGE) {
          setErrorView(<NoBookmarksError />);
        } else {
          setErrorView(<UnknownError message={e.message} />);
        }
        setIsLoading(false);
      });
  }, [query]);

  return { errorView, isLoading, data };
}
