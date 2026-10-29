import fs from "fs";
import Fuse from "fuse.js";
import { Logger } from "../logger/logger.service";
import { ObsidianUtils, Note } from "../../obsidian";
import { parsedYAMLFrontmatter } from "../../obsidian/internal/yaml";
import { BYTES_PER_KILOBYTE, BYTES_PER_MEGABYTE } from "../../utils/constants";

const logger = new Logger("ContentSearch");

export const MAX_CONTENT_SEARCH_RESULTS = 50;
export const MAX_SEARCH_FILE_SIZE_BYTES = 1024 * 1024;

export type SearchableNoteContentResult =
  | { status: "available"; content: string }
  | { status: "oversized" }
  | { status: "unavailable" };

export async function readNoteContentForSearch(note: Note): Promise<SearchableNoteContentResult> {
  const file = await fs.promises.open(note.path, "r");

  try {
    const stats = await file.stat();
    if (!stats.isFile()) return { status: "unavailable" };
    if (stats.size > MAX_SEARCH_FILE_SIZE_BYTES) {
      logger.debug(`Skipping content search for oversized note ${note.path} (${stats.size} bytes)`);
      return { status: "oversized" };
    }

    const bytesToRead = stats.size;
    const buffer = Buffer.allocUnsafe(bytesToRead);
    let totalBytesRead = 0;

    while (totalBytesRead < bytesToRead) {
      const { bytesRead } = await file.read(buffer, totalBytesRead, bytesToRead - totalBytesRead, totalBytesRead);
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
    }

    return { status: "available", content: buffer.subarray(0, totalBytesRead).toString("utf-8") };
  } finally {
    await file.close();
  }
}

export async function readSearchableNoteContent(note: Note): Promise<string | undefined> {
  const result = await readNoteContentForSearch(note);
  return result.status === "available" ? result.content : undefined;
}

export function findTitleOrPathMatches(notes: Note[], query: string, limit = MAX_CONTENT_SEARCH_RESULTS): Note[] {
  if (limit <= 0) return [];

  const titleFuse = new Fuse(notes, {
    keys: ["title", "path"],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
  });

  return titleFuse
    .search(query, { limit })
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .map((result) => result.item);
}

// Full-content search must stay well under the ~100 MB extension JS heap.
// readFile() + toLowerCase() keeps two string copies live; a single oversized
// Markdown clipping is enough to OOM the worker if we slurp it whole.
const MAX_CONTENT_SEARCH_BYTES = BYTES_PER_MEGABYTE; // 1 MiB
const MAX_TAG_SEARCH_BYTES = 64 * BYTES_PER_KILOBYTE;

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
  const titleMatches = findTitleOrPathMatches(filteredNotes, remainingQuery);
  logger.info(`Found ${titleMatches.length} title/path matches`);

  // Step 2: Search remaining notes by content (read files one at a time)
  const contentMatches: Note[] = [];
  let filesChecked = 0;
  let skippedLargeFiles = 0;

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
      const stat = await fs.promises.stat(note.path);
      if (!stat.isFile()) {
        continue;
      }

      filesChecked++;

      if (stat.size > MAX_CONTENT_SEARCH_BYTES) {
        skippedLargeFiles++;
        logger.debug(`Skipping oversized note during content search (${stat.size} bytes): ${note.path}`);
        continue;
      }

      // Read file content
      const content = await fs.promises.readFile(note.path, "utf-8");
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
    }, skipped ${skippedLargeFiles} oversized)`
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
  let prefixOnlyFiles = 0;

  // Normalize tag query (remove # if present, for comparison)
  const normalizedQuery = tagQuery.startsWith("#") ? tagQuery.slice(1).toLowerCase() : tagQuery.toLowerCase();

  for (const note of notes) {
    // Stop if we have enough results
    if (matches.length >= MAX_CONTENT_SEARCH_RESULTS) {
      logger.info(`Reached ${MAX_CONTENT_SEARCH_RESULTS} results after checking ${filesChecked} files, stopping early`);
      break;
    }

    try {
      const stat = await fs.promises.stat(note.path);
      if (!stat.isFile()) {
        continue;
      }

      filesChecked++;

      // Frontmatter lives at the top. Never slurp an oversized clipping just to
      // look for tags — read a prefix, then grow only until the closing ---.
      const usePrefixOnly = stat.size > MAX_CONTENT_SEARCH_BYTES;
      if (usePrefixOnly) {
        prefixOnlyFiles++;
      }

      const content = await readTagSearchContent(note.path, stat.size);

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

  logger.info(
    `Found ${matches.length} notes with tag "${tagQuery}" (checked ${filesChecked} files, prefix-only ${prefixOnlyFiles})`
  );

  return matches;
}

async function readFilePrefix(filePath: string, byteCount: number): Promise<string> {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(byteCount);
    const { bytesRead } = await handle.read(buffer, 0, byteCount, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    await handle.close();
  }
}

const OPENS_WITH_FRONTMATTER = /^---\s*\r?\n/;
const CLOSED_FRONTMATTER = /^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

function hasClosedFrontmatter(content: string): boolean {
  return CLOSED_FRONTMATTER.test(content);
}

/**
 * Tag search only needs YAML + nearby inline tags. Small files are read whole.
 * Oversized files start at 64 KiB and grow in 64 KiB steps until the frontmatter
 * closer is found or the 1 MiB content-search cap is hit. If the closer is still
 * missing, synthesize a parseable block so tags already read are not discarded.
 */
async function readTagSearchContent(filePath: string, fileSize: number): Promise<string> {
  if (fileSize <= MAX_CONTENT_SEARCH_BYTES) {
    return readFilePrefix(filePath, fileSize);
  }

  let bytesToRead = Math.min(fileSize, MAX_TAG_SEARCH_BYTES);
  let content = await readFilePrefix(filePath, bytesToRead);
  const startsWithFrontmatter = OPENS_WITH_FRONTMATTER.test(content);

  while (
    startsWithFrontmatter &&
    !hasClosedFrontmatter(content) &&
    bytesToRead < Math.min(fileSize, MAX_CONTENT_SEARCH_BYTES)
  ) {
    bytesToRead = Math.min(fileSize, MAX_CONTENT_SEARCH_BYTES, bytesToRead + MAX_TAG_SEARCH_BYTES);
    content = await readFilePrefix(filePath, bytesToRead);
  }

  if (startsWithFrontmatter && !hasClosedFrontmatter(content)) {
    content = withSyntheticFrontmatterCloser(content);
  }

  return content;
}

/**
 * A bare `\\n---\\n` closer is enough for block scalars, but a 1 MiB cut inside a
 * quoted YAML scalar or flow collection leaves the document invalid and YAML.parse
 * drops every tag already read. Try cheap repairs until the existing frontmatter
 * parser accepts the prefix.
 */
function withSyntheticFrontmatterCloser(content: string): string {
  const trimmed = content.replace(/\s*$/, "");
  const flowClosers = unmatchedFlowCollectionClosers(trimmed);
  const candidates = [`${trimmed}\n---\n`, `${trimmed}"\n---\n`, `${trimmed}'\n---\n`];
  if (flowClosers) {
    candidates.push(
      `${trimmed}${flowClosers}\n---\n`,
      `${trimmed}"${flowClosers}\n---\n`,
      `${trimmed}'${flowClosers}\n---\n`
    );
  }

  const lastNewline = trimmed.lastIndexOf("\n");
  if (lastNewline > 0) {
    candidates.push(`${trimmed.slice(0, lastNewline)}\n---\n`);
  }

  for (const candidate of candidates) {
    if (parsedYAMLFrontmatter(candidate) !== undefined) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Return the `]` / `}` suffix needed to close flow collections opened in the
 * prefix. Brackets inside quoted scalars are ignored so a cut like
 * `tags: [existing, "partial` still yields `]`.
 */
function unmatchedFlowCollectionClosers(prefix: string): string {
  const stack: string[] = [];
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i];

    if (inDoubleQuote) {
      if (ch === "\\" && i + 1 < prefix.length) {
        i += 1;
        continue;
      }
      if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inSingleQuote) {
      if (ch === "'") {
        if (prefix[i + 1] === "'") {
          i += 1;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
    } else if (ch === "'") {
      inSingleQuote = true;
    } else if (ch === "[") {
      stack.push("]");
    } else if (ch === "{") {
      stack.push("}");
    } else if ((ch === "]" || ch === "}") && stack[stack.length - 1] === ch) {
      stack.pop();
    }
  }

  return stack.reverse().join("");
}
