import fs from "fs";
import path from "path";
import { BookmarkDirectory, DiaProfile, HistoryEntry, RawBookmarks } from "../interfaces";
import {
  DEFAULT_DIA_PROFILE_ID,
  defaultDiaProfilePath,
  NO_BOOKMARKS_MESSAGE,
  NOT_INSTALLED_MESSAGE,
} from "../constants";

type DiaFile = "History" | "Bookmarks";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

const getProfileRootPath = () => path.join(userLibraryDirectoryPath(), ...defaultDiaProfilePath);

const getDiaFilePath = (fileName: DiaFile, profile?: string) =>
  path.join(getProfileRootPath(), profile ?? DEFAULT_DIA_PROFILE_ID, fileName);

export const getLocalStatePath = () => path.join(getProfileRootPath(), "Local State");

export const getBookmarksFilePath = (profile?: string) => getDiaFilePath("Bookmarks", profile);
export const getHistoryFilePath = (profile?: string) => getDiaFilePath("History", profile);

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
  const profileRoot = getProfileRootPath();
  if (!fs.existsSync(profileRoot)) {
    throw new Error(NOT_INSTALLED_MESSAGE);
  }

  const bookmarksFilePath = getBookmarksFilePath(profile);
  if (!fs.existsSync(bookmarksFilePath)) {
    throw new Error(NO_BOOKMARKS_MESSAGE);
  }

  const fileBuffer = await fs.promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

const loadProfilesFromLocalState = async (localStatePath: string, profileRoot: string): Promise<DiaProfile[]> => {
  const state = await fs.promises.readFile(localStatePath, "utf-8");
  const profiles = JSON.parse(state).profile?.info_cache;
  if (!profiles) {
    return [];
  }

  return Object.entries<{ name: string }>(profiles)
    .filter(([profileId]) => fs.existsSync(path.join(profileRoot, profileId, "Bookmarks")))
    .map(([id, { name }]) => ({ id, name }));
};

const loadProfilesFromFilesystem = (profileRoot: string): DiaProfile[] =>
  fs
    .readdirSync(profileRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profileRoot, entry.name, "Bookmarks")))
    .map((entry) => ({ id: entry.name, name: entry.name }));

export async function loadDiaProfiles(): Promise<{ profiles: DiaProfile[]; defaultProfile: string }> {
  const profileRoot = getProfileRootPath();
  if (!fs.existsSync(profileRoot)) {
    throw new Error(NOT_INSTALLED_MESSAGE);
  }

  const localStatePath = getLocalStatePath();

  let profiles: DiaProfile[] = [];
  let defaultProfile = DEFAULT_DIA_PROFILE_ID;

  if (fs.existsSync(localStatePath)) {
    try {
      profiles = await loadProfilesFromLocalState(localStatePath, profileRoot);
      const localState = JSON.parse(await fs.promises.readFile(localStatePath, "utf-8"));
      const lastUsed = localState.profile?.last_used;
      if (lastUsed && profiles.some((profile) => profile.id === lastUsed)) {
        defaultProfile = lastUsed;
      }
    } catch {
      profiles = [];
    }
  }

  if (profiles.length === 0) {
    profiles = loadProfilesFromFilesystem(profileRoot);
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name));

  if (profiles.length > 0 && !profiles.some((profile) => profile.id === defaultProfile)) {
    defaultProfile = profiles[0].id;
  }

  return { profiles, defaultProfile };
}
