import { promises, existsSync } from "fs";
import { BookmarkDirectory, RawBookmarks, SearchResult, BookmarkFolder } from "../interfaces";
import { getBookmarksFilePath } from "../util";
import { ReactNode, useEffect, useState } from "react";
import { NOT_INSTALLED_MESSAGE, DEFAULT_BRAVE_PROFILE_ID, BRAVE_PROFILE_KEY } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { useCachedState } from "@raycast/utils";

function extractBookmarkFolderFromBookmarkDirectory(bookmarkDirectory: BookmarkDirectory): BookmarkFolder[] {
  const bookmarks: BookmarkFolder[] = [];

  if (bookmarkDirectory.type === "folder") {
    const urlCount = bookmarkDirectory.children.filter((child) => child.type === "url").length;
    if (urlCount > 1) {
      bookmarks.push({
        id: bookmarkDirectory.id,
        name: bookmarkDirectory.name,
        children: bookmarkDirectory.children,
      });
    }
    bookmarkDirectory.children.forEach((child) => {
      bookmarks.push(...extractBookmarkFolderFromBookmarkDirectory(child));
    });
  }
  return bookmarks;
}

const extractBookmarkFolders = (rawBookmarks: RawBookmarks): BookmarkFolder[] => {
  const bookmarks: BookmarkFolder[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = extractBookmarkFolderFromBookmarkDirectory(rootLevelBookmarkFolders);
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const getBookmarkFolders = async (profile?: string): Promise<BookmarkFolder[]> => {
  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!existsSync(bookmarksFilePath)) {
    return [];
  }

  const fileBuffer = await promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarkFolders(JSON.parse(fileBuffer));
};

export function useBookmarkFolderSearch(): SearchResult<BookmarkFolder> {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const [data, setData] = useState<BookmarkFolder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode>();

  useEffect(() => {
    getBookmarkFolders(profile)
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
