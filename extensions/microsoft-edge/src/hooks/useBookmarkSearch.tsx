import fs from "fs";
import util from "util";
import { bookmarksFilePath, getProfileName } from "../utils/pathUtils";
import { NullableString, UrlDetail, UrlSearchResult } from "../schema/types";
import { useUrlSearch } from "./useUrlSearch";

const fsReadFile = util.promisify(fs.readFile);

type BookmarkNodeType = "folder" | "url";

export interface BookmarkDirectory {
  date_added: string;
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

const getBookmarksFromEdge = async (): Promise<UrlDetail[]> => {
  const profileName = getProfileName();
  const filePath = bookmarksFilePath(profileName);
  const fileBuffer = await fsReadFile(filePath, { encoding: "utf-8" });
  return getBookmarkEntriesFromRawBookmarks(JSON.parse(fileBuffer));
};

function getBookmarkEntriesFromBookmarkDirectory(bookmarkDirectory: BookmarkDirectory): UrlDetail[] {
  const bookmarks: UrlDetail[] = [];
  if (bookmarkDirectory.type === "folder") {
    bookmarkDirectory.children.forEach((child) => {
      bookmarks.push(...getBookmarkEntriesFromBookmarkDirectory(child));
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

const getBookmarkEntriesFromRawBookmarks = (rawBookmarks: RawBookmarks): UrlDetail[] => {
  const bookmarks: UrlDetail[] = [];
  Object.keys(rawBookmarks.roots).forEach((rootKey) => {
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = getBookmarkEntriesFromBookmarkDirectory(rootLevelBookmarkFolders);
    bookmarks.push(...bookmarkEntries);
  });
  return bookmarks;
};

const searchBookmarks = async (bookmarks: UrlDetail[], query: NullableString): Promise<UrlDetail[]> => {
  if (!query) {
    return bookmarks;
  }

  const terms = query.split(" ");
  return bookmarks.filter((bookmark) => {
    return terms.some((term) => bookmark.title.toLowerCase().includes(term.toLowerCase()));
  });
};

export function useEdgeBookmarkSearch(query: NullableString): UrlSearchResult {
  return useUrlSearch<UrlDetail[]>(query, getBookmarksFromEdge, searchBookmarks, "bookmarks");
}
