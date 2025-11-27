import fs from "fs";
import path from "path";
import { HistoryEntry, BookmarkDirectory } from "../interfaces";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }
  return path.join(process.env.HOME, "Library");
};

const getDiaFilePath = (fileName: string) => {
  const diaPath = path.join(userLibraryDirectoryPath(), "Application Support", "Dia", "User Data", "Default");
  return path.join(diaPath, fileName);
};

export const getHistoryDbPath = () => getDiaFilePath("History");
export const getBookmarksFilePath = () => getDiaFilePath("Bookmarks");

/**
 * Recursively extract bookmarks from nested folder structure
 */
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

/**
 * Extract all bookmarks from the Bookmarks JSON structure
 */
function extractBookmarks(bookmarksData: { roots: Record<string, BookmarkDirectory> }): HistoryEntry[] {
  const bookmarks: HistoryEntry[] = [];

  // Dia might use different root names, but typically includes "bookmark_bar" and "other"
  Object.values(bookmarksData.roots).forEach((root) => {
    bookmarks.push(...extractBookmarkFromBookmarkDirectory(root));
  });

  return bookmarks;
}

/**
 * Read and parse bookmarks from Dia's Bookmarks file (flattened list)
 */
export const getBookmarks = async (): Promise<HistoryEntry[]> => {
  const bookmarksFilePath = getBookmarksFilePath();
  if (!fs.existsSync(bookmarksFilePath)) {
    throw new Error("Bookmarks file not found");
  }

  const fileBuffer = await fs.promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  return extractBookmarks(JSON.parse(fileBuffer));
};

/**
 * Read and parse bookmarks from Dia's Bookmarks file (tree structure)
 */
export const getBookmarksTree = async (): Promise<BookmarkDirectory> => {
  const bookmarksFilePath = getBookmarksFilePath();
  if (!fs.existsSync(bookmarksFilePath)) {
    throw new Error("Bookmarks file not found");
  }

  const fileBuffer = await fs.promises.readFile(bookmarksFilePath, { encoding: "utf-8" });
  const bookmarksData = JSON.parse(fileBuffer);

  // Create a virtual root containing all bookmark roots
  const virtualRoot: BookmarkDirectory = {
    id: "root",
    name: "Bookmarks",
    type: "folder",
    date_added: "0",
    children: [],
  };

  // Add all roots as children
  if (bookmarksData.roots) {
    Object.entries(bookmarksData.roots).forEach(([key, value]) => {
      if (value && typeof value === "object" && "children" in value) {
        const root = value as BookmarkDirectory;
        // Add the root with a friendly name
        const friendlyName =
          key === "bookmark_bar"
            ? "Bookmarks Bar"
            : key === "other"
              ? "Other Bookmarks"
              : key === "synced"
                ? "Mobile Bookmarks"
                : root.name || key;

        virtualRoot.children.push({
          ...root,
          name: friendlyName,
        });
      }
    });
  }

  return virtualRoot;
};

/**
 * Build SQL WHERE clauses for history search with include/exclude terms
 */
export const whereClauses = (tableTitle: string, includeTerms: string[], excludeTerms: string[]) => {
  // Escape single quotes to prevent SQL injection
  const escapeSql = (str: string) => str.replace(/'/g, "''");
  const includeClauses = includeTerms.map(
    (t) => `(${tableTitle}.title LIKE '%${escapeSql(t)}%' OR ${tableTitle}.url LIKE '%${escapeSql(t)}%')`,
  );
  const excludeClauses = excludeTerms.map(
    (t) => `NOT (${tableTitle}.title LIKE '%${escapeSql(t)}%' OR ${tableTitle}.url LIKE '%${escapeSql(t)}%')`,
  );

  const allClauses = [...includeClauses, ...excludeClauses];
  return allClauses.length > 0 ? allClauses.join(" AND ") : "1=1";
};

/**
 * Generate SQL query to search history
 */
export const getHistoryQuery = (table: string, dateField: string, includeTerms: string[], excludeTerms: string[]) =>
  `SELECT id,
            url,
            title,
            datetime(${dateField} /
                     1000000 +
                     (strftime('%s', '1601-01-01')),
                     'unixepoch',
                     'localtime') as lastVisited
     FROM ${table}
     WHERE ${whereClauses(table, includeTerms, excludeTerms)}
     AND last_visit_time > 0
     ORDER BY ${dateField} DESC LIMIT 30;`;
