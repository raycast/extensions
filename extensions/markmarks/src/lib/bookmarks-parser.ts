import { Bookmark, BookmarkGroup, ParsedBookmarks } from "./types";

// Regex to match markdown headings (# to ######)
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

// Regex to match the start of a bookmark up to the url: - [Title](
// The title may contain brackets (e.g. "[PDF] Title") as long as "]" is not followed by "("
const BOOKMARK_START_REGEX = /^-\s*\[((?:[^\]]|\](?!\())+)\]\(/;

// Regex to match what follows the url: nothing, or an optional description
const BOOKMARK_DESCRIPTION_REGEX = /^(?:\s*-\s*(.+))?$/;

// Previous pattern, kept as a fallback so lines it matched (e.g. urls with an unbalanced "(") still parse
const LEGACY_BOOKMARK_REGEX = /^-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.+))?$/;

/**
 * Match a markdown link with optional description
 * Format: - [Title](url) - description
 * or: - [Title](url)
 * The url may contain balanced parentheses at any depth (e.g. "https://en.wikipedia.org/wiki/Foo_(bar)"),
 * but no whitespace, so it cannot consume the description
 */
function matchBookmark(line: string): { title: string; url: string; description?: string } | undefined {
  const startMatch = line.match(BOOKMARK_START_REGEX);
  if (startMatch) {
    const urlStart = startMatch[0].length;
    let depth = 0;

    for (let i = urlStart; i < line.length && !/\s/.test(line[i]); i++) {
      if (line[i] === "(") {
        depth++;
      } else if (line[i] === ")") {
        if (depth > 0) {
          depth--;
          continue;
        }

        // Closing parenthesis of the link
        const descriptionMatch = line.slice(i + 1).match(BOOKMARK_DESCRIPTION_REGEX);
        if (i > urlStart && descriptionMatch) {
          return { title: startMatch[1], url: line.slice(urlStart, i), description: descriptionMatch[1] };
        }
        break;
      }
    }
  }

  const legacyMatch = line.match(LEGACY_BOOKMARK_REGEX);
  return legacyMatch ? { title: legacyMatch[1], url: legacyMatch[2], description: legacyMatch[3] } : undefined;
}

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

    const bookmarkMatch = matchBookmark(line);
    if (bookmarkMatch) {
      const bookmark: Bookmark = {
        title: bookmarkMatch.title,
        url: bookmarkMatch.url,
        description: bookmarkMatch.description?.trim(),
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
