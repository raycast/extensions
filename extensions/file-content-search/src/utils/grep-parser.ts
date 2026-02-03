import type { GrepEntry } from "../types";
import { GrepEntryPool } from "./object-pool";

const MAX_LINE_LENGTH = 2048;
const MAX_CONTENT_LENGTH = 200;

// Global pool instance
const entryPool = new GrepEntryPool();

/** Reset pool between searches */
export const resetEntryPool = (): void => {
  entryPool.reset();
};

/** Clear pool completely */
export const clearEntryPool = (): void => {
  entryPool.clear();
};

/**
 * Extracts and formats content from raw grep output.
 * Trims whitespace and truncates to MAX_CONTENT_LENGTH if needed.
 */
const extractContent = (rawContent: string, contentStart: number, contentEnd: number): string => {
  if (contentEnd - contentStart > MAX_CONTENT_LENGTH) {
    return `${rawContent.slice(contentStart, contentStart + MAX_CONTENT_LENGTH)}...`;
  }
  if (contentStart === 0 && contentEnd === rawContent.length) {
    return rawContent;
  }
  return rawContent.slice(contentStart, contentEnd);
};

/**
 * Parse a grep output line into a GrepEntry.
 *
 * Expected grep output format: path:line:offset:content
 * Example: "src/main.ts:42:10:const foo = 'bar';"
 *
 * Uses object pooling to reduce memory allocations.
 * Truncates line to MAX_LINE_LENGTH immediately to avoid memory issues.
 *
 * Fast integer parsing: Instead of parseInt() which creates substrings,
 * we parse digits directly via charCodeAt(). ASCII digits 0-9 have codes
 * 48-57, so (charCode - 48) gives the numeric value.
 */
export const parseGrepLine = (line: string, id: number): GrepEntry | null => {
  const truncatedLine = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line;

  const firstColonIdx = truncatedLine.indexOf(":");
  if (firstColonIdx === -1) return null;

  const secondColonIdx = truncatedLine.indexOf(":", firstColonIdx + 1);
  if (secondColonIdx === -1) return null;

  const thirdColonIdx = truncatedLine.indexOf(":", secondColonIdx + 1);
  if (thirdColonIdx === -1) return null;

  const path = truncatedLine.slice(0, firstColonIdx);

  // Fast integer parsing without creating substrings for parseInt
  let lineNumber = 0;
  for (let i = firstColonIdx + 1; i < secondColonIdx; i++) {
    const char = truncatedLine.charCodeAt(i);
    if (char < 48 || char > 57) return null; // Not a digit
    lineNumber = lineNumber * 10 + (char - 48);
  }

  let offset = 0;
  for (let i = secondColonIdx + 1; i < thirdColonIdx; i++) {
    const char = truncatedLine.charCodeAt(i);
    if (char < 48 || char > 57) return null;
    offset = offset * 10 + (char - 48);
  }

  if (lineNumber === 0) return null;

  const rawContent = truncatedLine.slice(thirdColonIdx + 1);

  // Trim without creating intermediate strings
  let contentStart = 0;
  let contentEnd = rawContent.length;
  while (contentStart < contentEnd && rawContent.charCodeAt(contentStart) <= 32) contentStart++;
  while (contentEnd > contentStart && rawContent.charCodeAt(contentEnd - 1) <= 32) contentEnd--;

  if (contentStart >= contentEnd) return null;

  const content = extractContent(rawContent, contentStart, contentEnd);

  return entryPool.acquire(id, path, lineNumber, offset, content);
};
