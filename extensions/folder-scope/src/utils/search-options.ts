import type { ExtensionPreferences } from "../types/preferences";
import type { SearchOptions } from "../types/search";
import { sanitizeDirectoryNames, sanitizeExtensions, validateGlob } from "./validation.ts";

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min;
}

/**
 * The single normalization pipeline: every `SearchOptions` handed to an engine
 * must pass through here. Enforces the contradiction rules and bounds:
 *
 * - Plain-text mode is fixed-string matching; multiline only applies to regex,
 *   so it is forced off for text mode. Whole-word combines with both modes.
 * - Invalid globs, extensions, and directory names are dropped, not repaired.
 * - Numeric limits are clamped to the same bounds as preference validation.
 */
export function normalizeSearchOptions(options: SearchOptions): SearchOptions {
  return {
    ...options,
    multiline: options.searchMode === "regex" ? options.multiline : false,
    maxDepth: options.maxDepth === null ? null : clamp(options.maxDepth, 1, 100),
    maxResults: clamp(options.maxResults, 1, 10_000),
    maxFileSizeBytes: clamp(options.maxFileSizeBytes, 1024, 1_000 * 1024 * 1024),
    contextBefore: clamp(options.contextBefore, 0, 10),
    contextAfter: clamp(options.contextAfter, 0, 10),
    includedExtensions: sanitizeExtensions(options.includedExtensions),
    excludedExtensions: sanitizeExtensions(options.excludedExtensions),
    excludedDirectories: sanitizeDirectoryNames(options.excludedDirectories),
    includeGlobs: options.includeGlobs.map((glob) => glob.trim()).filter((glob) => validateGlob(glob) === null),
    excludeGlobs: options.excludeGlobs.map((glob) => glob.trim()).filter((glob) => validateGlob(glob) === null),
  };
}

/** Initial options derived from validated preferences; UI overrides layer on top later. */
export function searchOptionsFromPreferences(preferences: ExtensionPreferences): SearchOptions {
  return normalizeSearchOptions({
    caseMode: preferences.defaultCaseMode,
    searchMode: preferences.defaultSearchMode,
    wholeWord: false,
    multiline: false,
    invertMatch: false,
    maxDepth: preferences.defaultMaxDepth,
    includeHidden: preferences.searchHiddenFiles,
    followSymlinks: false,
    respectIgnoreFiles: preferences.respectIgnoreFiles,
    includeBinary: false,
    searchFileNames: false,
    includedExtensions: preferences.includedExtensions,
    excludedExtensions: [],
    excludedDirectories: preferences.excludedDirectories,
    includeGlobs: [],
    excludeGlobs: [],
    maxResults: preferences.maxResults,
    maxFileSizeBytes: preferences.maxFileSizeBytes,
    contextBefore: preferences.previewContextLines,
    contextAfter: preferences.previewContextLines,
  });
}
