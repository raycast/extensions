import fs from "fs";
import util from "util";
import { useEffect, useRef, useState } from "react";
import { NullableString } from "../schema/types";
import { bookmarksFilePath, getProfileName } from "../utils/pathUtils";

const fsReadFile = util.promisify(fs.readFile);

export interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
}

export interface EdgeBookmarkSearch {
  entries?: BookmarkEntry[];
  error?: string;
  isLoading: boolean;
}

type BookmarkNodeType = "folder" | "url";

export interface BookmarkDirectory {
  children: BookmarkDirectory[];
  type: BookmarkNodeType;
  id: string;
  guid: string;
  source?: string;
  url?: string;
  name: string;
  [key: string]: unknown;
}

export interface RawBookmarkRoot {
  [key: string]: BookmarkDirectory;
}

export interface RawBookmarks {
  roots: RawBookmarkRoot;
  [key: string]: unknown;
}

const getBookmarksFromEdge = async (profileName: string): Promise<BookmarkEntry[]> => {
  const filePath = bookmarksFilePath(profileName);
  const fileBuffer = await fsReadFile(filePath, { encoding: "utf-8" });
  return getBookmarkEntriesFromRawBookmarks(JSON.parse(fileBuffer));
};

function getBookmarkEntriesFromBookmarkDirectory(bookmarkDirectory: BookmarkDirectory): BookmarkEntry[] {
  const bookmarks: BookmarkEntry[] = [];
  if (bookmarkDirectory.type === "folder") {
    bookmarkDirectory.children.forEach((child) => {
      bookmarks.push(...getBookmarkEntriesFromBookmarkDirectory(child));
    });
  } else if (bookmarkDirectory.type === "url" && bookmarkDirectory.url) {
    bookmarks.push({
      id: bookmarkDirectory.id,
      url: bookmarkDirectory.url,
      title: bookmarkDirectory.name,
    });
  }
  return bookmarks;
}

const getBookmarkEntriesFromRawBookmarks = (rawBookmarks: RawBookmarks): BookmarkEntry[] => {
  const bookmarks: BookmarkEntry[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = getBookmarkEntriesFromBookmarkDirectory(rootLevelBookmarkFolders);
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const searchBookmarks = async (bookmarks: BookmarkEntry[], query: NullableString): Promise<BookmarkEntry[]> => {
  if (!query) {
    return bookmarks;
  }

  const terms = query.split(" ");
  return bookmarks.filter((bookmark) => {
    return terms.some((term) => bookmark.title.toLowerCase().includes(term.toLowerCase()));
  });
};

export function useEdgeBookmarkSearch(query: NullableString): EdgeBookmarkSearch {
  const [entries, setEntries] = useState<BookmarkEntry[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const bookmarksDataRef = useRef<BookmarkEntry[]>();

  let cancel = false;

  useEffect(() => {
    async function getHistory() {
      if (cancel) {
        return;
      }

      try {
        if (!bookmarksDataRef.current) {
          const profileName = getProfileName();
          bookmarksDataRef.current = await getBookmarksFromEdge(profileName);
        }

        setError(undefined);
        const bookmarkEntries = await searchBookmarks(bookmarksDataRef.current, query);
        setEntries(bookmarkEntries);
      } catch (e) {
        if (!cancel) {
          const errorMessage = (e as Error).message?.includes("no such file or directory")
            ? "Microsoft Edge not installed"
            : "Failed to load bookmarks";
          setError(errorMessage);
        }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    }

    getHistory();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { entries, error, isLoading };
}
