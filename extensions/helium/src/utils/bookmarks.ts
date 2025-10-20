import { Bookmark } from "../types";
import { getHeliumBookmarks } from "./applescript";

/**
 * Parse bookmark string from AppleScript format
 * Format: "name|url|id|folder" (folder is optional/empty string)
 */
function parseBookmarkString(bookmarkStr: string): Bookmark | null {
  try {
    const parts = bookmarkStr.split("|");

    if (parts.length < 3) {
      return null;
    }

    // Parse from the end: folder (optional), id, url, then title is everything else
    const folder = parts.length >= 4 ? parts[parts.length - 1].trim() : undefined;
    const id = parts[parts.length - 2].trim();
    const url = parts[parts.length - 3].trim();
    const title = parts
      .slice(0, parts.length - 3)
      .join("|")
      .trim();

    if (!url || !id) {
      return null;
    }

    return {
      id,
      url,
      title: title || "Untitled",
      folder: folder && folder !== "" ? folder : undefined,
    };
  } catch (error) {
    console.error("Error parsing bookmark string:", bookmarkStr, error);
    return null;
  }
}

/**
 * Get all bookmarks from Helium using AppleScript
 */
export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    const bookmarkStrings = await getHeliumBookmarks();

    if (!bookmarkStrings || bookmarkStrings.length === 0) {
      return [];
    }

    // Parse each bookmark string and filter out any that failed to parse
    const bookmarks = bookmarkStrings
      .map(parseBookmarkString)
      .filter((bookmark): bookmark is Bookmark => bookmark !== null);

    return bookmarks;
  } catch (error) {
    console.error("Error getting bookmarks from Helium:", error);
    throw new Error("Failed to get bookmarks from Helium");
  }
}

/**
 * Search bookmarks by query (matches title or URL)
 */
export function searchBookmarks(bookmarks: Bookmark[], query: string): Bookmark[] {
  if (!query) {
    return bookmarks;
  }

  const lowerQuery = query.toLowerCase();
  return bookmarks.filter(
    (bookmark) => bookmark.title.toLowerCase().includes(lowerQuery) || bookmark.url.toLowerCase().includes(lowerQuery),
  );
}
