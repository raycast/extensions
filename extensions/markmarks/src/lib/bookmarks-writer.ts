import * as fs from "fs";
import { Bookmark } from "./types";
import { parseBookmarks, findGroupByName } from "./bookmarks-parser";

/**
 * Format a bookmark as a markdown list item
 */
function formatBookmark(title: string, url: string, description?: string): string {
  if (description) {
    return `- [${title}](${url}) - ${description}`;
  }
  return `- [${title}](${url})`;
}

/**
 * Read the bookmarks file content
 */
export function readBookmarksFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Write content to the bookmarks file
 */
export function writeBookmarksFile(filePath: string, content: string): void {
  // Ensure the directory exists
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Add a new bookmark to a specific group (or root if groupName is empty)
 */
export function addBookmark(
  filePath: string,
  groupName: string,
  title: string,
  url: string,
  description?: string,
): void {
  let content = readBookmarksFile(filePath);
  const lines = content.split("\n");
  const newBookmarkLine = formatBookmark(title, url, description);

  // Handle root bookmarks (no group)
  if (!groupName) {
    const { groups, rootBookmarks } = parseBookmarks(content);

    let insertLine: number;
    if (rootBookmarks.length > 0) {
      // Insert after the last root bookmark
      insertLine = rootBookmarks[rootBookmarks.length - 1].line;
    } else if (groups.length > 0) {
      // Insert before the first group heading
      insertLine = groups[0].startLine - 1;
    } else {
      // Empty file, insert at the beginning
      insertLine = 0;
    }

    lines.splice(insertLine, 0, newBookmarkLine);
    content = lines.join("\n");
    writeBookmarksFile(filePath, content);
    return;
  }

  const { groups } = parseBookmarks(content);
  const group = findGroupByName(groups, groupName);

  if (!group) {
    // Group doesn't exist, create it at the end of the file
    const newGroupContent = `\n# ${groupName}\n\n${newBookmarkLine}`;
    content = content.trimEnd() + newGroupContent + "\n";
  } else {
    // Find the insertion point (after the last bookmark in the group, or after the heading)
    let insertLine: number;

    if (group.bookmarks.length > 0) {
      // Insert after the last bookmark
      insertLine = group.bookmarks[group.bookmarks.length - 1].line;
    } else if (group.children.length > 0) {
      // Insert before the first child group
      insertLine = group.children[0].startLine - 1;
    } else {
      // Insert right after the heading
      insertLine = group.startLine;
    }

    lines.splice(insertLine, 0, newBookmarkLine);
    content = lines.join("\n");
  }

  writeBookmarksFile(filePath, content);
}

/**
 * Edit an existing bookmark
 */
export function editBookmark(
  filePath: string,
  lineNumber: number,
  title: string,
  url: string,
  description?: string,
): void {
  const content = readBookmarksFile(filePath);
  const lines = content.split("\n");

  const index = lineNumber - 1;
  if (index >= 0 && index < lines.length) {
    lines[index] = formatBookmark(title, url, description);
    writeBookmarksFile(filePath, lines.join("\n"));
  }
}

/**
 * Delete a bookmark by line number
 */
export function deleteBookmark(filePath: string, lineNumber: number): void {
  const content = readBookmarksFile(filePath);
  const lines = content.split("\n");
  const index = lineNumber - 1;
  if (index >= 0 && index < lines.length) {
    lines.splice(index, 1);
    writeBookmarksFile(filePath, lines.join("\n"));
  }
}

/**
 * Move a bookmark to a different group
 */
export function moveBookmark(filePath: string, bookmark: Bookmark, targetGroupName: string): void {
  deleteBookmark(filePath, bookmark.line);
  addBookmark(filePath, targetGroupName, bookmark.title, bookmark.url, bookmark.description);
}

/**
 * Create a new group (heading) in the file
 */
export function createGroup(filePath: string, groupName: string, level: number = 1): void {
  let content = readBookmarksFile(filePath);

  const heading = "#".repeat(level);
  const newGroupContent = `\n${heading} ${groupName}\n`;

  content = content.trimEnd() + newGroupContent + "\n";
  writeBookmarksFile(filePath, content);
}
