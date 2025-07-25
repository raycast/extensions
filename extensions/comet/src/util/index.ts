import fs from "fs";
import path from "path";
import {
  DEFAULT_COMET_PROFILE_ID,
  defaultCometProfilePath,
  defaultCometStatePath,
  NO_BOOKMARKS_MESSAGE,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";
import { BookmarkDirectory, HistoryEntry, RawBookmarks } from "../interfaces";

type CometFile = "History" | "Bookmarks";
const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};
const getCometFilePath = (fileName: CometFile, profile?: string) => {
  const { profilePath } = getPreferenceValues<Preferences>();
  let resolvedProfilePath;
  if (profilePath) {
    resolvedProfilePath = path.join(profilePath, fileName);
  } else {
    resolvedProfilePath = path.join(
      userLibraryDirectoryPath(),
      ...defaultCometProfilePath,
      profile ?? DEFAULT_COMET_PROFILE_ID,
      fileName
    );
  }

  if (!fs.existsSync(resolvedProfilePath)) {
    throw new Error(
      `The profile path ${resolvedProfilePath} does not exist. Please check your Comet profile location. Then update it in Extension Settings -> Profile Path.`
    );
  }

  return resolvedProfilePath;
};

export const getHistoryDbPath = (profile?: string) => getCometFilePath("History", profile);

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultCometStatePath);

const getBookmarksFilePath = (profile?: string) => getCometFilePath("Bookmarks", profile);

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
  try {
    const bookmarksFilePath = getBookmarksFilePath(profile);
    const fileBuffer = await fs.promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
    const bookmarks = extractBookmarks(JSON.parse(fileBuffer));

    if (bookmarks.length === 0) {
      throw new Error(NO_BOOKMARKS_MESSAGE);
    }

    return bookmarks;
  } catch (error) {
    // If it's a profile that doesn't exist or file that doesn't exist,
    // always return the "no bookmarks" message
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }
};
