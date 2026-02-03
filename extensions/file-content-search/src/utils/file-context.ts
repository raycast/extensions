import { open } from "node:fs/promises";
import type { FileContext } from "../types";
import { LruCache } from "./lru-cache";

const matchStrings = {
  LOADING: "Loading...",
  EMPTY_FILE: "<Empty file>",
  FILE_CHANGED: "<File changed>",
  ERROR_READING_FILE: "Error reading file",
} as const;

const CONTEXT_WINDOW_SIZE = 2048;
const MAX_LINE_LENGTH = 80;
const NEW_LINE_BYTE = 10;
const CACHE_MAX_SIZE = 50;

/**
 * Cache for file context lookups.
 * Uses LRU eviction strategy to limit memory usage.
 */
class ContextCache {
  private cache = new LruCache<FileContext>(CACHE_MAX_SIZE);

  private makeKey(filePath: string, offset: number): string {
    return `${filePath}:${offset}`;
  }

  get(filePath: string, offset: number): FileContext | undefined {
    return this.cache.get(this.makeKey(filePath, offset));
  }

  set(filePath: string, offset: number, context: FileContext): void {
    this.cache.set(this.makeKey(filePath, offset), context);
  }

  clear(): void {
    this.cache.clear();
  }
}

const contextCache = new ContextCache();

/** Clears the file context cache. */
export const clearContextCache = (): void => {
  contextCache.clear();
};

/**
 * Extracts context lines around a match offset in a file.
 * Returns the matched line along with one line before and after.
 */
export const getFileContext = async (
  filePath: string,
  matchOffset: number,
): Promise<FileContext> => {
  const cached = contextCache.get(filePath, matchOffset);
  if (cached) return cached;

  const startRead = Math.max(0, matchOffset - CONTEXT_WINDOW_SIZE / 2);
  const readLength = CONTEXT_WINDOW_SIZE;

  try {
    await using handle = await open(filePath, "r");

    const buffer = new Uint8Array(readLength);
    const { bytesRead } = await handle.read(buffer, 0, readLength, startRead);

    if (bytesRead === 0) {
      return { before: [], match: matchStrings.EMPTY_FILE, after: [] };
    }

    const data = buffer.subarray(0, bytesRead);
    const relativeOffset = matchOffset - startRead;

    if (relativeOffset < 0 || relativeOffset >= data.length) {
      return { before: [], match: matchStrings.FILE_CHANGED, after: [] };
    }

    let matchStart = data.lastIndexOf(NEW_LINE_BYTE, relativeOffset - 1);
    matchStart = matchStart === -1 ? 0 : matchStart + 1;

    let matchEnd = data.indexOf(NEW_LINE_BYTE, relativeOffset);
    matchEnd = matchEnd === -1 ? data.length : matchEnd;

    const matchLine = decodeBufferSlice(data, matchStart, matchEnd);

    const beforeLines: string[] = [];
    if (matchStart > 0) {
      let prevLineStart = data.lastIndexOf(NEW_LINE_BYTE, matchStart - 2);
      prevLineStart = prevLineStart === -1 ? 0 : prevLineStart + 1;
      const prevLine = decodeBufferSlice(data, prevLineStart, matchStart - 1);
      if (prevLine) beforeLines.push(prevLine);
    }

    const afterLines: string[] = [];
    if (matchEnd < data.length) {
      let nextLineEnd = data.indexOf(NEW_LINE_BYTE, matchEnd + 1);
      nextLineEnd = nextLineEnd === -1 ? data.length : nextLineEnd;
      const nextLine = decodeBufferSlice(data, matchEnd + 1, nextLineEnd);
      if (nextLine) afterLines.push(nextLine);
    }

    const result: FileContext = {
      before: beforeLines,
      match: matchLine,
      after: afterLines,
    };

    contextCache.set(filePath, matchOffset, result);

    return result;
  } catch (error) {
    console.error(`Error reading context for ${filePath}:`, error);
    return { before: [], match: matchStrings.ERROR_READING_FILE, after: [] };
  }
};

const textDecoder = new TextDecoder("utf-8");

/**
 * Safely decodes a slice of a buffer to a string.
 * Truncates lines exceeding MAX_LINE_LENGTH.
 */
const decodeBufferSlice = (buffer: Uint8Array, start: number, end: number): string => {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(buffer.length, end);

  if (safeStart >= safeEnd) return "";

  const length = safeEnd - safeStart;
  if (length > MAX_LINE_LENGTH) {
    const slice = buffer.subarray(safeStart, safeStart + MAX_LINE_LENGTH);
    return `${textDecoder.decode(slice).replace(/\r$/, "")} ... [truncated]`;
  }

  return textDecoder.decode(buffer.subarray(safeStart, safeEnd)).replace(/\r$/, "");
};
