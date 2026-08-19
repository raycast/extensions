import type {
  CaseMode,
  EditorType,
  EngineChoice,
  ExtensionPreferences,
  NoFinderBehavior,
  SearchMode,
} from "../types/preferences";

/** Raw manifest values as stored by Raycast; any of them may be missing or garbage. */
export interface RawPreferences {
  defaultDirectory?: string;
  noFinderBehavior?: string;
  preferredEngine?: string;
  defaultCaseMode?: string;
  defaultSearchMode?: string;
  defaultMaxDepth?: string;
  maxResults?: string;
  maxFileSizeMb?: string;
  previewContextLines?: string;
  showMatchPreview?: boolean;
  searchHiddenFiles?: boolean;
  respectIgnoreFiles?: boolean;
  excludedDirectories?: string;
  includedExtensions?: string;
  debounceMs?: string;
  preferredEditor?: string;
}

export const DEFAULT_EXCLUDED_DIRECTORIES = [
  ".git",
  "node_modules",
  "bin",
  "obj",
  ".next",
  "dist",
  "build",
  "Library",
  ".cache",
  ".turbo",
  "DerivedData",
];

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Parses a positive integer within [min, max]; anything else yields the fallback. */
function boundedInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Splits a comma-separated list, trimming entries and dropping empties. */
export function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Pure validation: every invalid stored value falls back to a safe default. */
export function validatePreferences(raw: RawPreferences): ExtensionPreferences {
  const depth = Number.parseInt(raw.defaultMaxDepth ?? "", 10);
  const excluded = parseList(raw.excludedDirectories);

  return {
    defaultDirectory: raw.defaultDirectory?.trim() || null,
    noFinderBehavior: oneOf<NoFinderBehavior>(raw.noFinderBehavior, ["prompt", "default-directory", "home"], "home"),
    preferredEngine: oneOf<EngineChoice>(raw.preferredEngine, ["automatic", "bundled", "system", "node"], "automatic"),
    defaultCaseMode: oneOf<CaseMode>(raw.defaultCaseMode, ["smart", "sensitive", "insensitive"], "smart"),
    defaultSearchMode: oneOf<SearchMode>(raw.defaultSearchMode, ["text", "regex"], "text"),
    defaultMaxDepth: Number.isNaN(depth) || depth < 1 ? null : Math.min(depth, 100),
    maxResults: boundedInt(raw.maxResults, 1, 10_000, 250),
    maxFileSizeBytes: boundedInt(raw.maxFileSizeMb, 1, 1_000, 10) * 1024 * 1024,
    previewContextLines: boundedInt(raw.previewContextLines, 0, 10, 0),
    showMatchPreview: raw.showMatchPreview !== false,
    searchHiddenFiles: raw.searchHiddenFiles === true,
    respectIgnoreFiles: raw.respectIgnoreFiles !== false,
    excludedDirectories: excluded.length > 0 ? excluded : DEFAULT_EXCLUDED_DIRECTORIES,
    includedExtensions: parseList(raw.includedExtensions).map((ext) => ext.replace(/^\./, "")),
    debounceMs: boundedInt(raw.debounceMs, 50, 1_000, 200),
    preferredEditor: oneOf<EditorType>(raw.preferredEditor, ["vscode", "cursor", "zed", "sublime", "rider"], "vscode"),
  };
}
