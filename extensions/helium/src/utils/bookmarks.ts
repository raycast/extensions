import { promises as fs } from "fs";
import { Bookmark } from "../types";
import { findProfileFile } from "./helium-profile";

// Chromium bookmark tree node as stored in the profile's `Bookmarks` JSON file.
interface RawBookmarkNode {
  id?: string;
  guid?: string;
  name?: string;
  type?: string;
  url?: string;
  children?: RawBookmarkNode[];
}

interface RawBookmarksFile {
  roots?: Record<string, RawBookmarkNode>;
}

function collectBookmarks(node: RawBookmarkNode, folderPath: string, bookmarks: Bookmark[]): void {
  if (node.type === "url" && node.url) {
    bookmarks.push({
      id: node.guid ?? node.id ?? node.url,
      url: node.url,
      title: node.name?.trim() || "Untitled",
      folder: folderPath || undefined,
    });
    return;
  }

  if (!Array.isArray(node.children)) return;

  for (const child of node.children) {
    const childPath =
      child.type === "folder" && child.name ? (folderPath ? `${folderPath}/${child.name}` : child.name) : folderPath;
    collectBookmarks(child, childPath, bookmarks);
  }
}

/**
 * Extract bookmarks from the parsed contents of a Chromium `Bookmarks` file.
 * Root containers (bookmark bar, other bookmarks, ...) are not treated as folders;
 * nested folders become a "Parent/Child" path in `folder`.
 */
export function extractBookmarks(raw: unknown): Bookmark[] {
  const roots = (raw as RawBookmarksFile | undefined)?.roots;
  if (!roots || typeof roots !== "object") return [];

  const bookmarks: Bookmark[] = [];
  for (const root of Object.values(roots)) {
    if (root && typeof root === "object") {
      collectBookmarks(root, "", bookmarks);
    }
  }
  return bookmarks;
}

/**
 * Get all bookmarks by reading the Helium profile's `Bookmarks` JSON file.
 * Works without the browser running.
 */
export async function getBookmarks(): Promise<Bookmark[]> {
  const bookmarksPath = findProfileFile("Bookmarks");
  if (!bookmarksPath) {
    return [];
  }

  try {
    const fileContents = await fs.readFile(bookmarksPath, "utf8");
    return extractBookmarks(JSON.parse(fileContents));
  } catch (error) {
    console.error("Error reading Helium bookmarks file:", error);
    throw new Error("Failed to read bookmarks from the Helium profile");
  }
}
