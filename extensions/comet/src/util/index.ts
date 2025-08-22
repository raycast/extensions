import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  DEFAULT_COMET_PROFILE_ID,
  defaultCometProfilePath,
  defaultCometStatePath,
  NO_BOOKMARKS_MESSAGE,
} from "../constants";
import { getPreferenceValues, getApplications, showToast, Toast, open, openExtensionPreferences } from "@raycast/api";
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
    resolvedProfilePath = path.join(profilePath, profile ?? DEFAULT_COMET_PROFILE_ID, fileName);
  } else {
    resolvedProfilePath = path.join(
      userLibraryDirectoryPath(),
      ...defaultCometProfilePath,
      profile ?? DEFAULT_COMET_PROFILE_ID,
      fileName
    );
  }

  return resolvedProfilePath;
};

export const getHistoryDbPath = (profile?: string) => getCometFilePath("History", profile);

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultCometStatePath);

const getCometProfilesDirectory = () => {
  const { profilePath } = getPreferenceValues<Preferences>();
  if (profilePath) {
    return profilePath;
  } else {
    return path.join(userLibraryDirectoryPath(), ...defaultCometProfilePath);
  }
};

const checkProfilePathExists = (): boolean => {
  try {
    const profilesDir = getCometProfilesDirectory();
    return fs.existsSync(profilesDir);
  } catch (error) {
    return false;
  }
};

export const getAvailableProfiles = (): string[] => {
  try {
    const profilesDir = getCometProfilesDirectory();
    if (!fs.existsSync(profilesDir)) {
      return [];
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
        try {
          const itemPath = path.join(profilesDir, item);
          return fs.statSync(itemPath).isDirectory() && (item.startsWith("Profile ") || item === "Default");
        } catch (error) {
          // Skip items that can't be stat'd (like broken symlinks)
          return false;
        }
      })
      .forEach((item) => {
        if (item !== "Default") {
          profiles.push(item);
        }
      });

    return profiles;
  } catch (error) {
    return [];
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

    // Check if file exists before trying to read it
    if (!fs.existsSync(bookmarksFilePath)) {
      throw new Error(NO_BOOKMARKS_MESSAGE);
    }

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

async function isCometInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "ai.perplexity.comet");
}

export async function checkProfileConfiguration() {
  const { profilePath } = getPreferenceValues<Preferences>();

  // Only check if custom profilePath is set
  if (profilePath && !checkProfilePathExists()) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Comet profile directory not found.",
      message: "Please check your profile path in extension settings.",
      primaryAction: {
        title: "Open Extension Settings",
        onAction: (toast) => {
          openExtensionPreferences();
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }

  // If no custom path or path exists, everything is OK
  return true;
}

export async function checkCometInstallation() {
  if (!(await isCometInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Comet browser is not installed.",
      message: "Install it from: https://comet.perplexity.ai/",
      primaryAction: {
        title: "Go to https://comet.perplexity.ai/",
        onAction: (toast) => {
          open("https://comet.perplexity.ai/");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }
  return true;
}

export function showCometNotOpenToast() {
  showToast({
    style: Toast.Style.Failure,
    title: "You'll need to have Comet open to use this extension",
  });
}

const whereClauses = (tableTitle: string, terms: string[]) => {
  const sanitizedTerms = terms.map((t) => t.replace(/'/g, "''"));
  return sanitizedTerms
    .map((t) => `(${tableTitle}.title LIKE '%${t}%' OR ${tableTitle}.url LIKE '%${t}%')`)
    .join(" AND ");
};

export const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            url,
            title
     FROM ${table}
     WHERE ${whereClauses(table, terms)}
     AND last_visit_time > 0
     ORDER BY ${date_field} DESC LIMIT 30;`;

export const getHistory = async (profile?: string, query?: string): Promise<HistoryEntry[]> => {
  try {
    const dbPath = getHistoryDbPath(profile);

    if (!fs.existsSync(dbPath)) {
      return [];
    }

    // Use the same query logic as useHistorySearch
    const terms = query ? query.trim().split(" ") : [""];
    const sqlQuery = getHistoryQuery("urls", "last_visit_time", terms);

    try {
      // Create temporary copy to avoid database locks
      const tempDbPath = `${dbPath}.tmp.${Date.now()}`;
      execSync(`cp "${dbPath}" "${tempDbPath}"`, { timeout: 5000 });

      const output = execSync(`sqlite3 -separator "|" "${tempDbPath}" "${sqlQuery.replace(/"/g, '""')}"`, {
        encoding: "utf8" as BufferEncoding,
        timeout: 10000,
      }) as string;

      // Clean up
      fs.unlinkSync(tempDbPath);

      if (!output || output.trim() === "") {
        return [];
      }

      // Parse results
      const lines = output.trim().split("\n");
      return lines
        .filter((line: string) => line.trim() !== "")
        .map((line: string) => {
          const parts = line.split("|");
          if (parts.length >= 3) {
            return {
              id: parts[0],
              url: parts[1],
              title: parts[2],
            };
          }
          return null;
        })
        .filter((item): item is HistoryEntry => Boolean(item));
    } catch (error) {
      // If copy approach fails, return empty array
      return [];
    }
  } catch (error) {
    return [];
  }
};
