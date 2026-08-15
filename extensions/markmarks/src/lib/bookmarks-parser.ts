import { Bookmark, BookmarkGroup, ParsedBookmarks } from "./types";

// Regex to match markdown headings (# to ######)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

// Regex to match markdown links with optional description
// Format: - [Title](url) - description
// or: - [Title](url)
const BOOKMARK_REGEX = /^-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.+))?$/;

/**
 * Parse a markdown file content into a structured bookmark tree
 */
export function parseBookmarks(content: string): ParsedBookmarks {
  const lines = content.split("\n");
  const groups: BookmarkGroup[] = [];
  const rootBookmarks: Bookmark[] = [];
  const groupStack: BookmarkGroup[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed line numbers

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const name = headingMatch[2].trim();

      const newGroup: BookmarkGroup = {
        name,
        level,
        bookmarks: [],
        children: [],
        startLine: lineNumber,
      };

      // Find the right parent for this heading level
      while (groupStack.length > 0 && groupStack[groupStack.length - 1].level >= level) {
        groupStack.pop();
      }

      if (groupStack.length === 0) {
        // Top-level group
        groups.push(newGroup);
      } else {
        // Nested group
        groupStack[groupStack.length - 1].children.push(newGroup);
      }

      groupStack.push(newGroup);
      continue;
    }

    const bookmarkMatch = line.match(BOOKMARK_REGEX);
    if (bookmarkMatch) {
      const bookmark: Bookmark = {
        title: bookmarkMatch[1],
        url: bookmarkMatch[2],
        description: bookmarkMatch[3]?.trim(),
        line: lineNumber,
      };

      if (groupStack.length > 0) {
        groupStack[groupStack.length - 1].bookmarks.push(bookmark);
      } else {
        rootBookmarks.push(bookmark);
      }
    }
  }

  return { groups, rootBookmarks, rawContent: content };
}

/**
 * Flatten all groups into a single array for easy iteration
 */
export function flattenGroups(groups: BookmarkGroup[]): BookmarkGroup[] {
  const result: BookmarkGroup[] = [];

  function traverse(group: BookmarkGroup) {
    result.push(group);
    for (const child of group.children) {
      traverse(child);
    }
  }

  for (const group of groups) {
    traverse(group);
  }

  return result;
}

/**
 * Get all bookmarks from all groups as a flat array
 */
export function getAllBookmarks(
  groups: BookmarkGroup[],
  rootBookmarks: Bookmark[] = [],
): Array<Bookmark & { groupName: string; groupPath: string }> {
  const result: Array<Bookmark & { groupName: string; groupPath: string }> = [];

  // Add root bookmarks first (no group)
  for (const bookmark of rootBookmarks) {
    result.push({
      ...bookmark,
      groupName: "",
      groupPath: "",
    });
  }

  function traverse(group: BookmarkGroup, path: string[]) {
    const currentPath = [...path, group.name];
    const groupPath = currentPath.join(" > ");

    for (const bookmark of group.bookmarks) {
      result.push({
        ...bookmark,
        groupName: group.name,
        groupPath,
      });
    }

    for (const child of group.children) {
      traverse(child, currentPath);
    }
  }

  for (const group of groups) {
    traverse(group, []);
  }

  return result;
}

/**
 * Find a group by its name (searches recursively)
 */
export function findGroupByName(groups: BookmarkGroup[], name: string): BookmarkGroup | undefined {
  for (const group of groups) {
    if (group.name === name) {
      return group;
    }
    const found = findGroupByName(group.children, name);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Get all group names for dropdown selection
 */
export function getGroupNames(groups: BookmarkGroup[]): Array<{ name: string; path: string; level: number }> {
  const result: Array<{ name: string; path: string; level: number }> = [];

  function traverse(group: BookmarkGroup, path: string[]) {
    const currentPath = [...path, group.name];
    result.push({
      name: group.name,
      path: currentPath.join(" > "),
      level: group.level,
    });

    for (const child of group.children) {
      traverse(child, currentPath);
    }
  }

  for (const group of groups) {
    traverse(group, []);
  }

  return result;
}
