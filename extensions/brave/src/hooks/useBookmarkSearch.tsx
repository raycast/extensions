import { promises, existsSync } from "fs";
import { BookmarkDirectory, HistoryEntry, RawBookmarks, SearchResult } from "../interfaces";
import { getBookmarksFilePath } from "../util";
import { ReactNode, useEffect, useState } from "react";
import { NOT_INSTALLED_MESSAGE, DEFAULT_BRAVE_PROFILE_ID, BRAVE_PROFILE_KEY } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { useCachedState } from "@raycast/utils";

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

const getBookmarks = async (profile?: string): Promise<HistoryEntry[]> => {
  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!existsSync(bookmarksFilePath)) {
    return [];
  }

  const fileBuffer = await promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

export function useBookmarkSearch(): SearchResult<HistoryEntry> {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode>();

  useEffect(() => {
    getBookmarks(profile)
      .then((bookmarks) => {
        setData(bookmarks);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [profile]);

  return { errorView, isLoading, data, profile: { name: "", id: profile as string } };
}
