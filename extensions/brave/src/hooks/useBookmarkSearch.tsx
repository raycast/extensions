import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { promises, existsSync } from "fs";
import { BookmarkDirectory, BookmarkEntry, RawBookmarks, SearchResult } from "../interfaces";
import { getBookmarksFilePath } from "../util";
import { ReactNode, useEffect, useState } from "react";
import { NOT_INSTALLED_MESSAGE, DEFAULT_BRAVE_PROFILE_ID, BRAVE_PROFILE_KEY } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { useCachedState } from "@raycast/utils";

function extractBookmarkFromBookmarkDirectory(
  bookmarkDirectory: BookmarkDirectory,
  folders: string[],
  rootName: string,
): BookmarkEntry[] {
  const bookmarks: BookmarkEntry[] = [];

  if (bookmarkDirectory.type === "folder") {
    bookmarkDirectory.children.forEach((child) => {
      bookmarks.push(...extractBookmarkFromBookmarkDirectory(child, [...folders, bookmarkDirectory.name], rootName));
    });
  } else if (bookmarkDirectory.type === "url" && bookmarkDirectory.url) {
    bookmarks.push({
      id: bookmarkDirectory.id,
      url: bookmarkDirectory.url,
      title: bookmarkDirectory.name,
      folderPath: folders.join("/") || rootName,
      lastVisited: new Date(bookmarkDirectory.date_added),
    });
  }
  return bookmarks;
}

const extractBookmarks = (rawBookmarks: RawBookmarks): BookmarkEntry[] => {
  const bookmarks: BookmarkEntry[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = rootLevelBookmarkFolders.children.flatMap((child) =>
      extractBookmarkFromBookmarkDirectory(child, [], rootLevelBookmarkFolders.name),
    );
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const getBookmarks = async (profile?: string): Promise<BookmarkEntry[]> => {
  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!existsSync(bookmarksFilePath)) {
    return [];
  }

  const fileBuffer = await promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

export function useBookmarkSearch(): SearchResult<BookmarkEntry> {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const [data, setData] = useState<BookmarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode>();

  useEffect(() => {
    setIsLoading(true);
    setErrorView(undefined);
    getBookmarks(profile)
      .then((bookmarks) => {
        setData(bookmarks);
        setIsLoading(false);
      })
      .catch((e) => {
        if (getErrorMessage(e).includes(NOT_INSTALLED_MESSAGE)) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError error={e} />);
        }
        setIsLoading(false);
      });
  }, [profile]);

  return { errorView, isLoading, data, profile: { name: "", id: profile as string } };
}
