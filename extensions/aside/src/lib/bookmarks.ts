import { promises as fs } from "fs";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { ASIDE_USER_DATA_DIR, resolveAsideProfile } from "./constants";
import { filterSearchable } from "./search";
import type { Bookmark } from "./types";

// Chromium bookmarks JSON shape. We model only the fields we read; everything
// else is left untyped. The file lives at
// `~/Library/Application Support/Aside/<profile>/Bookmarks`.
interface ChromiumBookmarkNode {
  type: "url" | "folder";
  id: string;
  guid?: string;
  name: string;
  url?: string;
  children?: ChromiumBookmarkNode[];
}

interface ChromiumBookmarksFile {
  roots: Record<string, ChromiumBookmarkNode>;
}

const ROOT_LABELS: Record<string, string> = {
  bookmark_bar: "Bookmarks Bar",
  other: "Other Bookmarks",
  synced: "Mobile Bookmarks",
};

function collectBookmarks(node: ChromiumBookmarkNode, folderPath: string[], bookmarks: Bookmark[]): void {
  if (node.type === "url" && node.url) {
    bookmarks.push({
      id: node.guid || node.id,
      title: node.name || node.url,
      url: node.url,
      folder: folderPath.length > 0 ? folderPath.join("/") : undefined,
    });
    return;
  }
  if (node.type === "folder" && Array.isArray(node.children)) {
    const nextPath = node.name ? [...folderPath, node.name] : folderPath;
    for (const child of node.children) collectBookmarks(child, nextPath, bookmarks);
  }
}

export async function getBookmarks(profile?: string): Promise<Bookmark[]> {
  const configuredProfile = resolveAsideProfile(profile);
  const filePath = join(ASIDE_USER_DATA_DIR, configuredProfile, "Bookmarks");

  let bookmarkFileText: string;
  try {
    bookmarkFileText = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        await fs.access(join(ASIDE_USER_DATA_DIR, configuredProfile));
        return [];
      } catch {
        // Fall through to the actionable profile error below.
      }
    }
    throw new Error(
      `Could not read Aside bookmarks for profile "${configuredProfile}". Check the profile setting and Raycast Full Disk Access.`,
    );
  }

  let bookmarkFile: ChromiumBookmarksFile;
  try {
    bookmarkFile = JSON.parse(bookmarkFileText) as ChromiumBookmarksFile;
  } catch {
    throw new Error(`Aside bookmarks for profile "${configuredProfile}" contain malformed JSON.`);
  }
  if (!bookmarkFile.roots || typeof bookmarkFile.roots !== "object" || Array.isArray(bookmarkFile.roots)) {
    throw new Error(`Aside bookmarks for profile "${configuredProfile}" have an unsupported structure.`);
  }

  const bookmarks: Bookmark[] = [];
  for (const [rootKey, rootNode] of Object.entries(bookmarkFile.roots)) {
    if (!rootNode || typeof rootNode !== "object") continue;
    const label = ROOT_LABELS[rootKey] ?? rootNode.name ?? rootKey;
    collectBookmarks({ ...rootNode, name: label }, [], bookmarks);
  }

  const seenBookmarkKeys = new Set<string>();
  return bookmarks.filter((bookmark) => {
    const bookmarkKey = `${bookmark.url}|${bookmark.folder ?? ""}`;
    if (seenBookmarkKeys.has(bookmarkKey)) return false;
    seenBookmarkKeys.add(bookmarkKey);
    return true;
  });
}

interface BookmarkSearchResult {
  totalMatches: number;
  bookmarks: Bookmark[];
}

/** Search the configured profile by title, URL, and folder path. */
export async function searchBookmarks(query: string, limit = 20): Promise<BookmarkSearchResult> {
  const { profile } = getPreferenceValues<Preferences>();
  const bookmarks = await getBookmarks(profile);
  const matches = filterSearchable(bookmarks, query, (bookmark) => bookmark.folder);
  return {
    totalMatches: matches.length,
    bookmarks: matches.slice(0, Math.min(50, Math.max(1, Math.floor(limit)))),
  };
}
