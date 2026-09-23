/**
 * Helpers for the history detail side panel: image previews and file metadata.
 */

import { statSync, openSync, readSync, closeSync } from "fs";
import { extname } from "path";

/**
 * Extensions Raycast's detail markdown can render inline as an image. Unlike
 * text, this cannot be sniffed from content: the bound is the renderer's
 * capability, not the file's nature.
 */
const PREVIEWABLE_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".bmp", ".tiff"]);

const TEXT_PREVIEW_MAX_BYTES = 4096;
const TEXT_PREVIEW_MAX_LINES = 25;
/** Fraction of U+FFFD replacement characters above which a decode is judged binary. */
const MAX_REPLACEMENT_CHAR_RATIO = 0.05;

/** Whether the file at `filePath` can be shown as an inline image preview. */
export function isPreviewableImage(filePath: string): boolean {
  return PREVIEWABLE_IMAGE_EXTS.has(extname(filePath).toLowerCase());
}

/**
 * Read the first lines of a file for the detail panel, deciding text-ness
 * from the content itself rather than a curated extension list.
 * Returns `undefined` when the file is unreadable, empty, or looks binary.
 */
export function readTextPreview(filePath: string): string | undefined {
  let fd: number;
  try {
    fd = openSync(filePath, "r");
  } catch {
    return undefined;
  }
  try {
    const buffer = Buffer.alloc(TEXT_PREVIEW_MAX_BYTES);
    const bytesRead = readSync(fd, buffer, 0, TEXT_PREVIEW_MAX_BYTES, 0);
    if (bytesRead === 0) return undefined;
    const chunk = buffer.subarray(0, bytesRead);
    // NUL bytes mean binary (this also rejects UTF-16, which Raycast's
    // markdown block wouldn't render sensibly anyway)
    if (chunk.includes(0)) return undefined;
    const decoded = chunk.toString("utf-8");
    // Binary without NUL bytes decodes to a soup of replacement characters
    const replacementCount = decoded.split("�").length - 1;
    if (replacementCount / decoded.length > MAX_REPLACEMENT_CHAR_RATIO) return undefined;
    const lines = decoded.split("\n");
    const truncated = lines.length > TEXT_PREVIEW_MAX_LINES;
    const text = lines.slice(0, TEXT_PREVIEW_MAX_LINES).join("\n").trimEnd();
    if (text === "") return undefined;
    return truncated ? `${text}\n…` : text;
  } catch {
    return undefined;
  } finally {
    closeSync(fd);
  }
}

/**
 * Wrap a snippet in a markdown code fence guaranteed to be longer than any
 * backtick run inside it, so file content can never close the fence early and
 * render as markdown.
 */
export function toCodeFenceMarkdown(snippet: string): string {
  const longestRun = snippet.match(/`+/g)?.reduce((longest, run) => Math.max(longest, run.length), 0) ?? 0;
  const fence = "`".repeat(Math.max(4, longestRun + 1));
  return `${fence}\n${snippet}\n${fence}`;
}

/**
 * Encode an absolute path as a `file://` URI usable in markdown image syntax.
 * Each path segment is percent-encoded so spaces, parentheses, and unicode survive.
 */
export function toFileUri(filePath: string): string {
  // encodeURIComponent leaves parentheses alone, but an unencoded ")" closes
  // the surrounding markdown image link early — encode them too.
  const encodeSegment = (segment: string) => encodeURIComponent(segment).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `file://${filePath.split("/").map(encodeSegment).join("/")}`;
}

export interface FileStats {
  readonly size: number;
  readonly modifiedMs: number;
}

/** Stat a file, returning `undefined` when it no longer exists. */
export function getFileStats(filePath: string): FileStats | undefined {
  try {
    const stats = statSync(filePath);
    return { size: stats.size, modifiedMs: stats.mtimeMs };
  } catch {
    return undefined;
  }
}

/** Format a byte count for display, e.g. `1.4 MB`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
