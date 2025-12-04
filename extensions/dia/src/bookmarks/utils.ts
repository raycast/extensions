import fs from "fs";
import { BookmarkDirectory, BookmarkItem } from "./types";
import { parseBookmarkSearchQuery, matchesBookmarkQuery } from "./parsing";
import { getBookmarksPath } from "../dia";
import { BOOKMARK_FILE_NOT_FOUND_MESSAGE } from "./constants";

/**
 * Read and parse bookmarks from Dia's Bookmarks file (tree structure)
 */
export async function getBookmarksTree(): Promise<BookmarkDirectory> {
  const bookmarksFilePath = getBookmarksPath();
  if (!fs.existsSync(bookmarksFilePath)) {
    throw new Error(BOOKMARK_FILE_NOT_FOUND_MESSAGE);
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
}

/**
 * Navigate to a specific folder by path
 */
export function navigateToBookmarkFolder(tree: BookmarkDirectory, pathIds: string[]): BookmarkDirectory | null {
  if (pathIds.length === 0) {
    return tree;
  }

  let current: BookmarkDirectory = tree;
  for (const id of pathIds) {
    const found = current.children.find((child) => child.id === id && child.type === "folder");
    if (!found) {
      return null;
    }
    current = found;
  }
  return current;
}

/**
 * Convert BookmarkDirectory to BookmarkItem with path information
 */
export function toBookmarkItem(dir: BookmarkDirectory, path: string[], idPath: string[]): BookmarkItem {
  return {
    id: dir.id,
    name: dir.name,
    type: dir.type,
    url: dir.url,
    path: path,
    idPath: idPath,
    children: dir.children,
  };
}

/**
 * Recursively search all bookmarks
 */
export function searchAllBookmarks(
  dir: BookmarkDirectory,
  query: string,
  currentPath: string[] = [],
  currentIdPath: string[] = [],
): BookmarkItem[] {
  const results: BookmarkItem[] = [];
  const parsedQuery = parseBookmarkSearchQuery(query);

  for (const child of dir.children) {
    if (child.type === "url" && child.url) {
      const searchableText = `${child.name.toLowerCase()} ${child.url.toLowerCase()}`;
      if (matchesBookmarkQuery(searchableText, parsedQuery)) {
        results.push(toBookmarkItem(child, [...currentPath, child.name], [...currentIdPath]));
      }
    } else if (child.type === "folder") {
      // Also search folder names
      const folderNameMatch = matchesBookmarkQuery(child.name.toLowerCase(), parsedQuery);
      const newIdPath = [...currentIdPath, child.id];
      if (folderNameMatch) {
        results.push(toBookmarkItem(child, [...currentPath, child.name], newIdPath));
      }
      // Recursively search in subfolders
      results.push(...searchAllBookmarks(child, query, [...currentPath, child.name], newIdPath));
    }
  }

  return results;
}
