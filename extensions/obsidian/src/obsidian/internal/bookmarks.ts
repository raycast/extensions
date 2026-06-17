import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";
import { Logger } from "../../api/logger/logger.service";
import { Note } from "./notes";

export type BookmarkFile = {
  type: "file";
  path: string;
  title: string;
};

export type BookmarkGroup = {
  type: "group";
  title: string;
  items: BookmarkEntry[];
};

export type BookmarkEntry = BookmarkFile | BookmarkGroup;

export type BookmarkJson = {
  items: BookmarkEntry[];
};

const logger = new Logger("Bookmarks");

/** Flattens BookmarkEntry groups down to simple bookmark entries without groups */
function* flattenBookmarks(bookmarkEntries: BookmarkEntry[]): Generator<BookmarkFile> {
  for (const item of bookmarkEntries) {
    if (item.type === "file") yield item;
    if (item.type === "group" && item.items) yield* flattenBookmarks(item.items);
  }
}

export function getBookmarksJson(vaultPath: string): BookmarkJson | undefined {
  const { configFileName } = getPreferenceValues();
  const bookmarksJsonPath = `${vaultPath}/${configFileName || ".obsidian"}/bookmarks.json`;
  if (!fs.existsSync(bookmarksJsonPath)) {
    logger.warning("No bookmarks JSON found");
    return;
  }
  const fileContent = fs.readFileSync(bookmarksJsonPath, "utf-8");
  const bookmarkJson = JSON.parse(fileContent) as BookmarkJson;
  logger.info(bookmarkJson);
  return bookmarkJson;
}

function writeBookmarksJson(vaultPath: string, bookmarksJson: BookmarkJson, configFileName: string) {
  const bookmarksJsonPath = `${vaultPath}/${configFileName}/bookmarks.json`;
  fs.writeFileSync(bookmarksJsonPath, JSON.stringify(bookmarksJson, null, 2));
}

export function getAllBookmarkFiles(vaultPath: string): BookmarkFile[] {
  const bookmarkJson = getBookmarksJson(vaultPath);
  if (!bookmarkJson) return [];
  return Array.from(flattenBookmarks(bookmarkJson.items));
}

export function getBookmarkedNotePaths(vaultPath: string): string[] {
  const bookmarkFiles = getAllBookmarkFiles(vaultPath);
  const notePaths = bookmarkFiles.map((note) => note.path);
  logger.info(notePaths);
  return notePaths;
}

/** Bookmark a note in a vault if it was not bookmarked yet */
export function bookmarkNote(vaultPath: string, note: Note, configFileName: string = ".obsidian") {
  const bookmarksJson = getBookmarksJson(vaultPath);
  const relativeNotePath = path.relative(vaultPath, note.path);

  // Check if the note is already bookmarked
  const bookmarkedFiles = getAllBookmarkFiles(vaultPath);
  if (bookmarkedFiles.some((file) => file.path === relativeNotePath)) {
    logger.info(`Note ${note.title} is already bookmarked`);
    return;
  }

  // Create a new bookmark entry
  const bookmarkedNote: BookmarkFile = {
    type: "file",
    title: note.title,
    path: relativeNotePath,
  };

  // If no bookmarks.json exists, create a new one with just this note
  if (!bookmarksJson) {
    const newBookmarksJson: BookmarkJson = {
      items: [bookmarkedNote],
    };
    writeBookmarksJson(vaultPath, newBookmarksJson, configFileName);
    return;
  }

  // Add the note to the root level of bookmarks, preserving the existing structure
  bookmarksJson.items.push(bookmarkedNote);
  writeBookmarksJson(vaultPath, bookmarksJson, configFileName);
  logger.info(`Bookmarked note: ${note.title}`);
}

/** Unbookmark a note in a vault if it was bookmarked */
export function unbookmarkNote(vaultPath: string, note: Note, configFileName: string = ".obsidian") {
  const bookmarksJson = getBookmarksJson(vaultPath);
  if (!bookmarksJson) {
    logger.warning("No bookmarks JSON found, can't unbookmark note.");
    return;
  }

  const notePath = path.relative(vaultPath, note.path);
  let bookmarkFound = false;

  // Function to filter out the bookmark we want to remove
  const removeBookmark = (items: BookmarkEntry[]): boolean => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // If this is the file we want to remove
      if (item.type === "file" && item.path === notePath) {
        items.splice(i, 1);
        return true;
      }

      // If this is a group, check its items
      if (item.type === "group" && item.items && removeBookmark(item.items)) {
        return true;
      }
    }
    return false;
  };

  // Try to remove the bookmark, preserving the structure
  bookmarkFound = removeBookmark(bookmarksJson.items);

  if (bookmarkFound) {
    writeBookmarksJson(vaultPath, bookmarksJson, configFileName);
    logger.info(`Removed bookmark for note: ${note.title}`);
  } else {
    logger.warning(`Note not found in bookmarks: ${note.title}`);
  }
}
