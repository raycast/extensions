import { getPreferenceValues } from "@raycast/api";
import { Vault } from "../../vault.types";
import { BookmarkEntry, BookmarkFile, BookMarkJson } from "./bookmarks.types";
import fs from "fs";
import path from "path";
import { Note } from "../notes.types";
import { Logger } from "../../../logger/logger.service";

const logger = new Logger("Bookmarks");

/** Flattens BookmarkEntry groups down to simple bookmark entries without groups */
function* flattenBookmarks(bookmarkEntries: BookmarkEntry[]): Generator<BookmarkFile> {
  for (const item of bookmarkEntries) {
    if (item.type === "file") yield item;
    if (item.type === "group" && item.items) yield* flattenBookmarks(item.items);
  }
}

function getBookmarksJson(vault: Vault): BookMarkJson | undefined {
  const { configFileName } = getPreferenceValues();
  const bookmarksJsonPath = `${vault.path}/${configFileName || ".obsidian"}/bookmarks.json`;
  if (!fs.existsSync(bookmarksJsonPath)) {
    logger.warning("No bookmarks JSON found");
    return;
  }
  const fileContent = fs.readFileSync(bookmarksJsonPath, "utf-8");
  const bookmarkJson = JSON.parse(fileContent) as BookMarkJson;
  logger.info(bookmarkJson);
  return bookmarkJson;
}

function writeBookmarksJson(vault: Vault, bookmarksJson: BookMarkJson) {
  const { configFileName } = getPreferenceValues();
  const bookmarksJsonPath = `${vault.path}/${configFileName || ".obsidian"}/bookmarks.json`;
  fs.writeFileSync(bookmarksJsonPath, JSON.stringify(bookmarksJson, null, 2));
}

function getAllBookmarkFiles(vault: Vault): BookmarkFile[] {
  const bookmarkJson = getBookmarksJson(vault);
  if (!bookmarkJson) return [];
  return Array.from(flattenBookmarks(bookmarkJson.items));
}

export function getBookmarkedNotePaths(vault: Vault): string[] {
  const bookmarkFiles = getAllBookmarkFiles(vault);
  const notePaths = bookmarkFiles.map((note) => note.path);
  logger.info(notePaths);
  return notePaths;
}

/** Bookmark a note in a vault if it was not bookmarked yet */
export function bookmarkNote(vault: Vault, note: Note) {
  const bookmarksJson = getBookmarksJson(vault);
  const relativeNotePath = path.relative(vault.path, note.path);

  // Check if the note is already bookmarked
  const bookmarkedFiles = getAllBookmarkFiles(vault);
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
    const newBookmarksJson: BookMarkJson = {
      items: [bookmarkedNote],
    };
    writeBookmarksJson(vault, newBookmarksJson);
    return;
  }

  // Add the note to the root level of bookmarks, preserving the existing structure
  bookmarksJson.items.push(bookmarkedNote);
  writeBookmarksJson(vault, bookmarksJson);
  logger.info(`Bookmarked note: ${note.title}`);
}

/** Unbookmark a note in a vault if it was bookmarked */
export function unbookmarkNote(vault: Vault, note: Note) {
  const bookmarksJson = getBookmarksJson(vault);
  if (!bookmarksJson) {
    logger.warning("No bookmarks JSON found, can't unbookmark note.");
    return;
  }

  const notePath = path.relative(vault.path, note.path);
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
    writeBookmarksJson(vault, bookmarksJson);
    logger.info(`Removed bookmark for note: ${note.title}`);
  } else {
    logger.warning(`Note not found in bookmarks: ${note.title}`);
  }
}
