import { useEffect, useState } from "react";
import { promises, existsSync } from "fs";
import { BookmarkEntry, BookmarkDirectory, RawBookmarks } from "../interfaces";
import path from "path";

const BOOKMARKS_FILE_PATH = "/Library/Application Support/Chromium/Default/Bookmarks";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, BOOKMARKS_FILE_PATH);
};

const BOOKMARKS: BookmarkEntry[] = Array.from(Array(1).keys()).map((key) => {
  return {
    id: key.toString(),
    url: "https://www.google.com",
    title: "Loading Error",
    lastVisited: new Date(),
  };
});

function extractBookmarkFromBookmarkDirectory(bookmarkDirectory: BookmarkDirectory): BookmarkEntry[] {
  const bookmarks: BookmarkEntry[] = [];

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

const extractBookmarks = (rawBookmarks: RawBookmarks): BookmarkEntry[] => {
  const bookmarks: BookmarkEntry[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = extractBookmarkFromBookmarkDirectory(rootLevelBookmarkFolders);
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const getBookmarks = async (): Promise<BookmarkEntry[]> => {
  if (!existsSync(userLibraryDirectoryPath())) {
    console.warn("Bookmarks file not found, returning mock data");
    return BOOKMARKS;
  }

  try {
    const fileBuffer = await promises.readFile(userLibraryDirectoryPath(), { encoding: "utf-8" });
    return extractBookmarks(JSON.parse(fileBuffer));
  } catch (error) {
    console.error("Error reading bookmarks file:", error);
    return BOOKMARKS;
  }
};

export function useBookmarkSearch() {
  const [data, setData] = useState<BookmarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getBookmarks()
      .then((bookmarks) => {
        setData(bookmarks);
        setIsLoading(false);
      })
      .catch(() => {
        console.error("Error getting bookmarks");
        setIsLoading(false);
      });
  }, []);

  return {
    data,
    isLoading,
  };
}
