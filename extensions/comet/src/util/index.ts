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
      fileName,
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
  } catch {
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
        } catch {
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
  } catch {
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
  } catch {
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

function extractBookmarkFromBookmarkDirectory(
  bookmarkDirectory: BookmarkDirectory,
  maxResults?: number,
  currentCount = { count: 0 },
): HistoryEntry[] {
  // Early return if we've reached the limit
  if (maxResults !== undefined && currentCount.count >= maxResults) {
    return [];
  }

  if (bookmarkDirectory.type === "url" && bookmarkDirectory.url) {
    // Direct bookmark - create and return immediately
    const bookmark: HistoryEntry = {
      id: bookmarkDirectory.id,
      url: bookmarkDirectory.url,
      title: bookmarkDirectory.name,
      dateAdded: bookmarkDirectory.date_added,
    };
    currentCount.count++;
    return [bookmark];
  }

  if (bookmarkDirectory.type === "folder") {
    const bookmarks: HistoryEntry[] = [];
    // Process children with early termination
    for (const child of bookmarkDirectory.children) {
      if (maxResults !== undefined && currentCount.count >= maxResults) {
        break;
      }
      const childBookmarks = extractBookmarkFromBookmarkDirectory(child, maxResults, currentCount);
      bookmarks.push(...childBookmarks);
    }
    return bookmarks;
  }

  return [];
}

const extractBookmarks = (rawBookmarks: RawBookmarks, maxResults?: number): HistoryEntry[] => {
  const bookmarks: HistoryEntry[] = [];
  let totalCount = 0;

  for (const rootKey of Object.keys(rawBookmarks.roots)) {
    if (maxResults !== undefined && totalCount >= maxResults) {
      break;
    }
    const rootLevelBookmarkFolders = rawBookmarks.roots[rootKey];
    const bookmarkEntries = extractBookmarkFromBookmarkDirectory(rootLevelBookmarkFolders, maxResults, {
      count: totalCount,
    });
    bookmarks.push(...bookmarkEntries);
    totalCount += bookmarkEntries.length;
  }
  return bookmarks;
};

export const getBookmarks = async (profile?: string, maxResults?: number): Promise<HistoryEntry[]> => {
  const startTime = Date.now();
  try {
    const bookmarksFilePath = getBookmarksFilePath(profile);

    // Check if file exists before trying to read it
    if (!fs.existsSync(bookmarksFilePath)) {
      throw new Error(NO_BOOKMARKS_MESSAGE);
    }

    const fileBuffer = await fs.promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
    const bookmarks = extractBookmarks(JSON.parse(fileBuffer), maxResults);

    if (bookmarks.length === 0) {
      throw new Error(NO_BOOKMARKS_MESSAGE);
    }

    console.debug(`Bookmark extraction took ${Date.now() - startTime}ms for ${bookmarks.length} items`);
    return bookmarks;
  } catch (error) {
    console.error(`Bookmark extraction failed after ${Date.now() - startTime}ms:`, error);

    // Add specific error handling for different failure modes
    if (error instanceof SyntaxError) {
      console.error("Invalid bookmark file format:", error);
    } else if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.error("Bookmark file not found:", error);
    } else if (error && typeof error === "object" && "code" in error && error.code === "EACCES") {
      console.error("Permission denied accessing bookmark file:", error);
    }

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
  // More robust SQL sanitization to prevent injection attacks
  const sanitizedTerms = terms.map((t) =>
    t.replace(/'/g, "''").replace(/"/g, '""').replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_"),
  );
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

// Optimized query for better performance with index hints
export const getOptimizedHistoryQuery = (table: string, date_field: string, terms: string[]) => {
  if (terms.length === 0 || (terms.length === 1 && terms[0] === "")) {
    // No search terms - return recent entries
    return `SELECT id, url, title FROM ${table} WHERE last_visit_time > 0 ORDER BY ${date_field} DESC LIMIT 30;`;
  }

  // Use optimized search with proper indexing and enhanced sanitization
  const sanitizedTerms = terms.map((t) =>
    t.replace(/'/g, "''").replace(/"/g, '""').replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_"),
  );
  const searchConditions = sanitizedTerms.map((t) => `(title LIKE '%${t}%' OR url LIKE '%${t}%')`).join(" AND ");

  return `SELECT id, url, title FROM ${table} WHERE ${searchConditions} AND last_visit_time > 0 ORDER BY ${date_field} DESC LIMIT 30;`;
};

// Enhanced secure query builder with parameterized approach
export const buildSecureHistoryQuery = (table: string, date_field: string, terms: string[]) => {
  if (terms.length === 0 || (terms.length === 1 && terms[0] === "")) {
    return {
      query: `SELECT id, url, title FROM ${table} WHERE last_visit_time > 0 ORDER BY ${date_field} DESC LIMIT 30;`,
      params: [],
    };
  }

  // Build parameterized query with placeholders
  const placeholders = terms
    .map((_, index) => `(title LIKE $${index * 2 + 1} OR url LIKE $${index * 2 + 2})`)
    .join(" AND ");
  const query = `SELECT id, url, title FROM ${table} WHERE ${placeholders} AND last_visit_time > 0 ORDER BY ${date_field} DESC LIMIT 30;`;

  // Create parameters array with LIKE patterns
  const params: string[] = [];
  terms.forEach((term) => {
    params.push(`%${term}%`, `%${term}%`); // title and url patterns
  });

  return { query, params };
};

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
    } catch {
      // If copy approach fails, return empty array
      return [];
    }
  } catch {
    return [];
  }
};
