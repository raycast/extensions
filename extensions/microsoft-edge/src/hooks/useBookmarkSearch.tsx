import { promises, existsSync } from "fs";
import { BookmarkDirectory, HistoryEntry, RawBookmarks, SearchResult } from "../types/interfaces";
import { getBookmarksFilePath } from "../utils/pathUtils";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { NoBookmarksError, NotInstalledError, UnknownError } from "../components";
import { geNotInstalledMessage, getNoBookmarksMessage } from "../utils/messageUtils";
import { validateAppIsInstalled } from "../actions";

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
  // First check if the app is installed
  await validateAppIsInstalled();

  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!existsSync(bookmarksFilePath)) {
    throw new Error(getNoBookmarksMessage());
  }

  const fileBuffer = await promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

export function useBookmarkSearch(query?: string): SearchResult<HistoryEntry> {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<string>();
  const [errorView, setErrorView] = useState<ReactNode>();

  const revalidate = useCallback(
    (profileId: string) => {
      setProfile(profileId);
    },
    [profile],
  );

  useEffect(() => {
    getBookmarks(profile)
      .then((bookmarks) => {
        setData(bookmarks.filter((bookmark) => bookmark.title.toLowerCase().includes(query?.toLowerCase() || "")));
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === geNotInstalledMessage()) {
          setErrorView(<NotInstalledError />);
        } else if (e.message === getNoBookmarksMessage()) {
          setErrorView(<NoBookmarksError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [profile, query]);

  return { errorView, isLoading, data, revalidate };
}
