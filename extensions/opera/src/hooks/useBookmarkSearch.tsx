import { readFile, existsSync } from "fs";
import { promisify } from "util";
import { BookmarkDirectory, HistoryEntry, RawBookmarks, SearchResult } from "../interfaces";
import { getBookmarksFilePath } from "../util";
import { ReactNode, useEffect, useState } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NoBookmarksError, NotInstalledError, UnknownError } from "../components";
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
  if (!existsSync(bookmarksFilePath)) {
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }

  const fileBuffer = await fsReadFileAsync(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

export function useBookmarkSearch(query?: string): SearchResult<HistoryEntry> {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode>();

  useEffect(() => {
    getBookmarks()
      .then((bookmarks) => {
        setData(bookmarks.filter((bookmark) => bookmark.title.toLowerCase().includes(query?.toLowerCase() || "")));
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (e.message === NO_BOOKMARKS_MESSAGE) {
          setErrorView(<NoBookmarksError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [query]);

  return { errorView, isLoading, data };
}
