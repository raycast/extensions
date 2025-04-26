import fs from "fs";
import path from "path";
import {
  DEFAULT_CHROME_PROFILE_ID,
  defaultChromeProfilePath,
  defaultChromeStatePath,
  NO_BOOKMARKS_MESSAGE,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";
import { BookmarkDirectory, HistoryEntry, RawBookmarks } from "../interfaces";
import Fuse from "fuse.js";

type ChromeFile = "History" | "Bookmarks";
const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};
const getChromeFilePath = (fileName: ChromeFile, profile?: string) => {
  const { profilePath } = getPreferenceValues<Preferences>();
  let resolvedProfilePath;
  if (profilePath) {
    resolvedProfilePath = path.join(profilePath, fileName);
  } else {
    resolvedProfilePath = path.join(
      userLibraryDirectoryPath(),
      ...defaultChromeProfilePath,
      profile ?? DEFAULT_CHROME_PROFILE_ID,
      fileName
    );
  }

  if (!fs.existsSync(resolvedProfilePath)) {
    throw new Error(
      `The profile path ${resolvedProfilePath} does not exist. Please check your Chrome profile location by visiting chrome://version -> Profile Path. Then update it in Extension Settings -> Profile Path.`
    );
  }

  return resolvedProfilePath;
};

export const getHistoryDbPath = (profile?: string) => getChromeFilePath("History", profile);

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultChromeStatePath);

const getBookmarksFilePath = (profile?: string) => getChromeFilePath("Bookmarks", profile);

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

export const getBookmarks = async (profile?: string): Promise<HistoryEntry[]> => {
  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!fs.existsSync(bookmarksFilePath)) {
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }

  const fileBuffer = await fs.promises.readFile(bookmarksFilePath, {
    encoding: "utf-8",
  });
  return extractBookmarks(JSON.parse(fileBuffer));
};

const fuzzyDefaultPreferenceName = "default";
const fuzzyDefaultThreshold = 0;
const fuzzySearchPreferencesMap = new Map<string, number>([
  [fuzzyDefaultPreferenceName, fuzzyDefaultThreshold],
  ["balanced", 0.4],
  ["loose", 0.7],
]);

export function filterElements<T>(items: T[], query: string | undefined, keys: string[], threshold: number) {
  if (!query) {
    return items;
  }

  if (threshold) {
    const fuse = new Fuse(items, {
      threshold: threshold,
      keys: keys,
    });

    return fuse.search(query).map((result) => result.item);
  }

  return items.filter((item: T) =>
    keys.some((key) => (item as unknown as Record<string, string>)[key].toLowerCase().includes(query.toLowerCase()))
  );
}

export function getBookmarksFuzzyThreshold(): number {
  return (
    fuzzySearchPreferencesMap.get(getPreferenceValues().bookmarksSearchAccuracy ?? fuzzyDefaultPreferenceName) ??
    fuzzyDefaultThreshold
  );
}
