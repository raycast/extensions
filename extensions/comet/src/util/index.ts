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

const getCometProfilesDirectory = () => {
  const { profilePath } = getPreferenceValues<Preferences>();
  if (profilePath) {
    return path.dirname(profilePath);
  } else {
    return path.join(userLibraryDirectoryPath(), ...defaultCometProfilePath);
  }
};

export const getAvailableProfiles = (): string[] => {
  try {
    const profilesDir = getCometProfilesDirectory();
    if (!fs.existsSync(profilesDir)) {
      return [DEFAULT_COMET_PROFILE_ID];
    }

    const items = fs.readdirSync(profilesDir);
    const profiles: string[] = [];

    // Add Default profile if it exists
    if (items.includes("Default")) {
      profiles.push("Default");
    }

    // Add all Profile X directories
    items
      .filter((item) => {
        const itemPath = path.join(profilesDir, item);
        return fs.statSync(itemPath).isDirectory() && (item.startsWith("Profile ") || item === "Default");
      })
      .forEach((item) => {
        if (item !== "Default") {
          profiles.push(item);
        }
      });

    return profiles.length > 0 ? profiles : [DEFAULT_COMET_PROFILE_ID];
  } catch (error) {
    return [DEFAULT_COMET_PROFILE_ID];
  }
};

export const getProfileMapping = (): { [key: string]: string } => {
  try {
    const path = getLocalStatePath();
    if (!fs.existsSync(path)) {
      return {};
    }

    const cometState = fs.readFileSync(path, "utf-8");
    const parsed = JSON.parse(cometState);
    if (parsed.profile?.info_cache) {
      const profiles = parsed.profile.info_cache;
      const mapping: { [key: string]: string } = {};

      Object.entries<{ name: string }>(profiles).forEach(([id, profile]) => {
        // Map display name to ID
        mapping[profile.name.toLowerCase()] = id;
        // Also map ID to itself for consistency
        mapping[id.toLowerCase()] = id;
        // Map "default" to "Default" for consistency
        if (id === "Default") {
          mapping["default"] = "Default";
        }
      });

      return mapping;
    }
  } catch (error) {
    // Fallback: just return available profiles mapped to themselves
  }

  const availableProfiles = getAvailableProfiles();
  const mapping: { [key: string]: string } = {};
  availableProfiles.forEach((profile) => {
    mapping[profile.toLowerCase()] = profile;
  });
  return mapping;
};

export const resolveProfileName = (profileInput?: string): string | undefined => {
  if (!profileInput) {
    return undefined;
  }

  const mapping = getProfileMapping();
  const resolved = mapping[profileInput.toLowerCase()];

  return resolved || profileInput; // Fallback to original input if not found
};

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
