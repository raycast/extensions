import fs from "fs";
import Fuse from "fuse.js";
import { Logger } from "../logger/logger.service";
import { ObsidianUtils, Note } from "../../obsidian";

const logger = new Logger("ContentSearch");

export const MAX_CONTENT_SEARCH_RESULTS = 50;
export const MAX_SEARCH_FILE_SIZE_BYTES = 1024 * 1024;

export async function readSearchableNoteContent(note: Note): Promise<string | undefined> {
  const file = await fs.promises.open(note.path, "r");

  try {
    const stats = await file.stat();
    if (!stats.isFile()) return undefined;

    const bytesToRead = Math.min(stats.size, MAX_SEARCH_FILE_SIZE_BYTES);
    const buffer = Buffer.allocUnsafe(bytesToRead);
    let totalBytesRead = 0;

    while (totalBytesRead < bytesToRead) {
      const { bytesRead } = await file.read(buffer, totalBytesRead, bytesToRead - totalBytesRead, totalBytesRead);
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
    }

    if (stats.size > MAX_SEARCH_FILE_SIZE_BYTES) {
      logger.debug(`Prefix-reading oversized note ${note.path} (${stats.size} bytes)`);
    }

    return buffer.subarray(0, totalBytesRead).toString("utf-8");
  } finally {
    await file.close();
  }
}

export function findTitleMatches(notes: Note[], query: string): Note[] {
  const titleFuse = new Fuse(notes, {
    keys: ["title"],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
  });

  return titleFuse
    .search(query)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .map((result) => result.item);
}

/**
 * Memory-efficient content search
 * First filters by title/path, then only reads content for remaining files
 * Stops early once we have enough results
 *
 * Special syntax:
 * - "tag:abc" - searches for notes with tag #abc only
 * - "tag:abc hello world" - searches for "hello world" in notes with tag #abc
 */
export async function searchNotesWithContent(notes: Note[], query: string): Promise<Note[]> {
  if (!query.trim()) {
    return notes;
  }

  // Check if there's a tag filter in the query
  const tagSearchMatch = query.match(/tag:(\S+)/i);
  let filteredNotes = notes;
  let remainingQuery = query;

  // Step 0: Filter by tag if tag: prefix is present
  if (tagSearchMatch) {
    const tagQuery = tagSearchMatch[1].trim();
    logger.info(`Filtering by tag "${tagQuery}" first`);
    filteredNotes = await searchNotesByTag(notes, tagQuery);
    logger.info(`Found ${filteredNotes.length} notes with tag "${tagQuery}"`);

    // Remove the tag: part from the query for the content search
    remainingQuery = query.replace(/tag:\S+/gi, "").trim();

    // If there's no remaining query, just return the tag-filtered notes
    if (!remainingQuery) {
      return filteredNotes;
    }
  }

  logger.info(`Searching ${filteredNotes.length} notes with content for "${remainingQuery}"`);

  const queryLower = remainingQuery.toLowerCase();

  // Step 1: Quick filter by title/path first (no file I/O)
  const titleMatches = findTitleMatches(filteredNotes, remainingQuery);
  logger.info(`Found ${titleMatches.length} title/path matches`);

  // Step 2: Search remaining notes by content (read files one at a time)
  const contentMatches: Note[] = [];
  let filesChecked = 0;

  // Early exit if we already have enough matches from title/path
  if (titleMatches.length >= MAX_CONTENT_SEARCH_RESULTS) {
    logger.info(`Already have ${titleMatches.length} title/path matches, skipping content search`);
    return titleMatches;
  }

  for (const note of filteredNotes) {
    // Skip if already matched by title/path
    if (titleMatches.some((m) => m.path === note.path)) {
      continue;
    }

    // Stop if we have enough total results
    if (titleMatches.length + contentMatches.length >= MAX_CONTENT_SEARCH_RESULTS) {
      logger.info(`Reached ${MAX_CONTENT_SEARCH_RESULTS} results after checking ${filesChecked} files, stopping early`);
      break;
    }

    try {
      filesChecked++;

      const content = await readSearchableNoteContent(note);
      if (content === undefined) continue;
      const contentLower = content.toLowerCase();

      // Simple substring match for content
      if (contentLower.includes(queryLower)) {
        contentMatches.push(note);
      }
    } catch (error) {
      logger.debug(`Error reading ${note.path}: ${error}`);
    }
  }

  logger.info(
    `Found ${contentMatches.length} content matches in ${filesChecked} files (total: ${
      titleMatches.length + contentMatches.length
    })`
  );

  // Combine results: title/path matches first (more relevant), then content matches
  return [...titleMatches, ...contentMatches];
}

/**
 * Memory-efficient tag search
 * Reads files one at a time and checks for tags
 */
async function searchNotesByTag(notes: Note[], tagQuery: string): Promise<Note[]> {
  logger.info(`Searching ${notes.length} notes for tag "${tagQuery}"`);

  const matches: Note[] = [];
  let filesChecked = 0;

  // Normalize tag query (remove # if present, for comparison)
  const normalizedQuery = tagQuery.startsWith("#") ? tagQuery.slice(1).toLowerCase() : tagQuery.toLowerCase();

  for (const note of notes) {
    // Stop if we have enough results
    if (matches.length >= MAX_CONTENT_SEARCH_RESULTS) {
      logger.info(`Reached ${MAX_CONTENT_SEARCH_RESULTS} results after checking ${filesChecked} files, stopping early`);
      break;
    }

    try {
      filesChecked++;

      const content = await readSearchableNoteContent(note);
      if (content === undefined) continue;

      // Extract tags from the file (both inline and YAML frontmatter)
      const tags = ObsidianUtils.getAllTags(content);

      // Check if any tag matches the query (case-insensitive)
      const hasMatchingTag = tags.some((tag) => tag.toLowerCase() === normalizedQuery);

      if (hasMatchingTag) {
        matches.push(note);
      }
    } catch (error) {
      logger.debug(`Error reading ${note.path}: ${error}`);
    }
  }

  logger.info(`Found ${matches.length} notes with tag "${tagQuery}" (checked ${filesChecked} files)`);

  return matches;
}
