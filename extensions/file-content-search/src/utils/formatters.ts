import { homedir } from "node:os";
import path from "node:path";

import type { FileContext, GrepEntry } from "../types";

/**
 * Formats a timestamp as a human-readable relative time string.
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time (e.g., "Just now", "5m ago", "2h ago", "3d ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const elapsedMs = now.getTime() - date.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMs / 3600000);
  const elapsedDays = Math.floor(elapsedMs / 86400000);

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Formats a search path into a display-friendly location name.
 * @param searchPath - Absolute path to format
 * @returns "~ (Home)" for home directory, otherwise the base name of the path
 */
export const formatLocationName = (searchPath: string): string => {
  return searchPath === homedir() ? "~ (Home)" : path.basename(searchPath);
};

/**
 * Replaces the home directory prefix with ~ for shorter display.
 * @param filePath - Absolute file path
 * @returns Path with home directory replaced by ~
 */
export const formatHomePath = (filePath: string): string => {
  return filePath.replace(homedir(), "~");
};

/**
 * Formats a match count as a human-readable string.
 * @param count - Number of matches
 * @returns "1 match" or "N matches"
 */
export const formatMatchCount = (count: number): string =>
  count === 1 ? "1 match" : `${count} matches`;

/**
 * Builds a markdown code block with context lines around a match.
 * @param entry - The grep entry with match information
 * @param context - File context with before/after lines
 * @returns Markdown string with syntax highlighting
 */
export const buildContextMarkdown = (entry: GrepEntry, context: FileContext): string => {
  const startLine = entry.line - context.before.length;
  const lines = [
    ...context.before.map((line, idx) => `${startLine + idx}: ${line}`),
    `→ ${entry.line}: ${context.match} ← match`,
    ...context.after.map((line, idx) => `${entry.line + 1 + idx}: ${line}`),
  ];

  const ext = path.extname(entry.path).slice(1);
  const lang = ext || "text";

  return `\`\`\`${lang}\n${lines.join("\n")}\n\`\`\``;
};

/**
 * Groups grep entries by their file path.
 * @param entries - Array of grep entries
 * @returns Map of file path to entries in that file
 */
export const groupEntriesByFile = (entries: GrepEntry[]): Map<string, GrepEntry[]> => {
  const grouped = new Map<string, GrepEntry[]>();
  for (const entry of entries) {
    const existing = grouped.get(entry.path);
    if (existing) {
      existing.push(entry);
    } else {
      grouped.set(entry.path, [entry]);
    }
  }
  return grouped;
};
