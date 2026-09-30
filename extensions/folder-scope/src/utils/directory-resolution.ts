import { dirname } from "node:path";
import type { SearchDirectory } from "../types/finder";
import type { NoFinderBehavior } from "../types/preferences";

export interface SelectionItem {
  path: string;
  isDirectory: boolean;
}

/** Strips trailing slashes so `/foo/bar/` and `/foo/bar` resolve identically. */
export function normalizeDirectoryPath(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : "/";
}

/** A selected directory wins; a selected file resolves to its parent. */
export function resolveFromSelection(items: SelectionItem[]): SearchDirectory | null {
  const first = items[0];
  if (!first) return null;
  const path = normalizeDirectoryPath(first.path);
  return first.isDirectory
    ? { path, source: "finder-selection" }
    : { path: dirname(path), source: "finder-file-parent" };
}

export interface FallbackInput {
  behavior: NoFinderBehavior;
  defaultDirectory: string | null;
  /** Whether the configured default directory exists and is readable. */
  defaultDirectoryValid: boolean;
  homeDirectory: string;
}

/**
 * Fallback order when Finder yields no directory.
 * Returns null when the user must be prompted to pick a directory.
 */
export function resolveFallback(input: FallbackInput): SearchDirectory | null {
  if (input.behavior === "home") {
    return { path: normalizeDirectoryPath(input.homeDirectory), source: "home" };
  }
  if (input.behavior === "default-directory" && input.defaultDirectory && input.defaultDirectoryValid) {
    return { path: normalizeDirectoryPath(input.defaultDirectory), source: "default-directory" };
  }
  return null;
}
