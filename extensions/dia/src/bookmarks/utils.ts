import fs from "fs";
import { BookmarkDirectory, BookmarkItem } from "./types";
import { parseBookmarkSearchQuery, matchesBookmarkQuery } from "./parsing";
import { getProfileFiles } from "../dia";
import { BOOKMARK_FILE_NOT_FOUND_MESSAGE } from "./constants";

const ROOT_NAMES: Record<string, string> = {
  bookmark_bar: "Bookmarks Bar",
  other: "Other Bookmarks",
  synced: "Mobile Bookmarks",
};

function buildProfileRoots(bookmarksData: { roots?: Record<string, unknown> }): BookmarkDirectory[] {
  const roots: BookmarkDirectory[] = [];
  Object.entries(bookmarksData.roots ?? {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && "children" in value) {
      const root = value as BookmarkDirectory;
      roots.push({ ...root, name: ROOT_NAMES[key] ?? (root.name || key) });
    }
  });
  return roots;
}

function prefixIds(node: BookmarkDirectory, prefix: string): BookmarkDirectory {
  return { ...node, id: `${prefix}:${node.id}`, children: (node.children ?? []).map((c) => prefixIds(c, prefix)) };
}

/**
 * Read and parse bookmarks from every Dia profile's Bookmarks file (tree structure).
 * With more than one profile, each profile's bookmarks sit under a folder named after it.
 */
export async function getBookmarksTree(): Promise<BookmarkDirectory> {
  const sources = await getProfileFiles("Bookmarks");
  if (sources.length === 0) {
    throw new Error(BOOKMARK_FILE_NOT_FOUND_MESSAGE);
  }

  const settled = await Promise.allSettled(
    sources.map(async ({ profile, path }) => ({
      profile,
      roots: buildProfileRoots(JSON.parse(await fs.promises.readFile(path, { encoding: "utf-8" }))),
    })),
  );
  const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length === settled.length) {
    throw failures[0].reason;
  }
  const perProfile = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  const children: BookmarkDirectory[] =
    perProfile.length === 1
      ? perProfile[0].roots
      : perProfile.map(({ profile, roots }) =>
          prefixIds(
            { id: profile.directory, name: profile.name, type: "folder", date_added: "0", children: roots },
            profile.directory,
          ),
        );

  return { id: "root", name: "Bookmarks", type: "folder", date_added: "0", children };
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
 * Recursively collect all bookmark URLs from a folder's children
 */
export function collectUrlsFromFolder(children: BookmarkDirectory[]): string[] {
  const urls: string[] = [];
  for (const child of children) {
    if (child.type === "url" && child.url) {
      urls.push(child.url);
    } else if (child.type === "folder" && child.children) {
      urls.push(...collectUrlsFromFolder(child.children));
    }
  }
  return urls;
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
