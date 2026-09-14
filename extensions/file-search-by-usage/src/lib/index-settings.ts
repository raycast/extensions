import os from "node:os";
import { INDEX_EXCLUSIONS } from "./index-scan";

/**
 * Configurable index scope.
 *
 * Raycast extension preferences are static and single-valued, so a growing list
 * of folders and patterns cannot live there. These are stored as one JSON value
 * and edited by the Search Index Settings command.
 *
 * Parsing is deliberately forgiving. This value is read on every rebuild, and a
 * corrupt or hand-edited entry must degrade to the defaults rather than stop the
 * user indexing anything.
 */

export const SETTINGS_KEY = "search-index-settings";

/** Highest number of entries the editor will keep, so one value stays small. */
export const MAX_SCOPES = 32;
export const MAX_PATTERNS = 128;

export type IndexSettings = {
  /** Extra roots to index, beyond the detected Google Drive mounts. */
  scopes: string[];
  /** fd --exclude globs, in addition to the built-in list. */
  patterns: string[];
  /** Index the detected Google Drive mounts. */
  includeDrive: boolean;
  /** Index dot-prefixed files and folders. */
  includeHidden: boolean;
  /** Respect .gitignore, .ignore and .fdignore while scanning. */
  useIgnoreFiles: boolean;
};

/**
 * Folders indexed unless the user changes them.
 *
 * The home folder, derived rather than written down: a literal /Users/<name>
 * would only ever be right on one Mac.
 *
 * /Applications is deliberately not here. Raycast already opens applications,
 * and descending into the bundles costs more than everything else combined:
 * 1,139,015 entries for /Applications against 36,721 with bundle contents
 * skipped. This index is for the user's own files.
 *
 * The home folder contains ~/Library/CloudStorage, so when Google Drive is
 * also enabled the scan drops the Drive roots as contained in the home root.
 * The result is the same paths under one root.
 */
export function defaultScopes(home = os.homedir()): string[] {
  return [home];
}

/**
 * Names excluded unless the user changes them.
 *
 * Passed to fd verbatim, so these are fd globs. Matching Raycast's File Search
 * defaults: scratch files, the caches that dominate a home folder by count,
 * and the two iCloud branches that hold application state rather than
 * documents.
 */
export const DEFAULT_PATTERNS: readonly string[] = [
  "*.tmp",
  "*.temp",
  "node_modules",
  "**/tmp/**",
  "**/temp/**",
  "**/[Cc]ache/**",
  "**/[Cc]aches/**",
  "**/Library/Application Support/**",
  "**/Mobile Documents/**/PreferenceSync/**",
  "**/Mobile Documents/**/Application Support/**",
  /*
   * Per-application sandboxes and mail storage. Measured under ~/Library:
   * Containers 2,296,614+, Daemon Containers 2,263,454+, Application Support
   * 939,099, Mail 315,884, Group Containers 59,307. That is an order of
   * magnitude more than every document the user owns, and none of it is
   * something anyone searches for by name.
   *
   * ~/Library/Mobile Documents stays: that is iCloud Drive.
   */
  "**/Library/Containers/**",
  "**/Library/Daemon Containers/**",
  "**/Library/Group Containers/**",
  "**/Library/Mail/**",
];

export const DEFAULT_SETTINGS: IndexSettings = {
  scopes: defaultScopes(),
  patterns: [...DEFAULT_PATTERNS],
  includeDrive: true,
  /*
   * Off by default, which is also what Raycast's File Search does.
   *
   * Measured over the default home scope: 936,166 entries in 27.8s at 719 MiB
   * with hidden files off, against 1,456,562 in 41.2s at 1019 MiB with them on.
   * The 520,000 difference is dot-directories holding language and editor
   * caches, not documents.
   *
   * The cost of leaving it off is that a dot-prefixed query has nothing
   * indexed to match. Turning it on in Search Index Settings is what makes
   * those findable.
   */
  includeHidden: false,
  useIgnoreFiles: false,
};

/** The exclusions that always apply, shown in the editor as read-only. */
export const BUILT_IN_PATTERNS: readonly string[] = INDEX_EXCLUSIONS;

/**
 * A stored list, or the default when the field is not a list at all.
 *
 * An empty stored array is kept empty, because a user who removed every scope
 * meant it. A missing or malformed field is different: it used to yield an
 * empty list, so a truncated or hand-edited file loaded as no scopes and no
 * patterns, and the next rebuild indexed nothing.
 */
function cleanList(
  value: unknown,
  max: number,
  fallback: readonly string[],
): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed === "" || out.includes(trimmed)) continue;
    if (out.length >= max) break;
    out.push(trimmed);
  }
  return out;
}

function cleanFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Turn a stored string into settings, falling back to defaults per field. */
export function parseSettings(raw: string | undefined): IndexSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (typeof value !== "object" || value === null)
    return { ...DEFAULT_SETTINGS };
  const record = value as Record<string, unknown>;
  return {
    scopes: cleanList(record.scopes, MAX_SCOPES, DEFAULT_SETTINGS.scopes),
    patterns: cleanList(
      record.patterns,
      MAX_PATTERNS,
      DEFAULT_SETTINGS.patterns,
    ),
    includeDrive: cleanFlag(record.includeDrive, DEFAULT_SETTINGS.includeDrive),
    includeHidden: cleanFlag(
      record.includeHidden,
      DEFAULT_SETTINGS.includeHidden,
    ),
    useIgnoreFiles: cleanFlag(
      record.useIgnoreFiles,
      DEFAULT_SETTINGS.useIgnoreFiles,
    ),
  };
}

export function serializeSettings(settings: IndexSettings): string {
  return JSON.stringify(settings);
}

export type AddResult =
  | { kind: "added"; settings: IndexSettings }
  | { kind: "duplicate" }
  | { kind: "full"; max: number }
  | { kind: "invalid"; reason: string };

/**
 * Add a scope.
 *
 * Absolute paths only: fd is given the root directly, and a relative path would
 * resolve against whatever directory the Raycast process happens to be in.
 */
export function addScope(settings: IndexSettings, folder: string): AddResult {
  const trimmed = folder.trim().replace(/\/+$/u, "");
  if (trimmed === "")
    return { kind: "invalid", reason: "Choose a folder to index" };
  if (!trimmed.startsWith("/"))
    return { kind: "invalid", reason: "A search scope must be a full path" };
  if (settings.scopes.includes(trimmed)) return { kind: "duplicate" };
  if (settings.scopes.length >= MAX_SCOPES)
    return { kind: "full", max: MAX_SCOPES };
  return {
    kind: "added",
    settings: { ...settings, scopes: [...settings.scopes, trimmed] },
  };
}

/**
 * Add an ignore pattern.
 *
 * Patterns are passed to fd verbatim as `--exclude` values, so fd's own glob
 * syntax applies. Leading-wildcard directory globs and character classes both
 * work, verified against fd 10.5.0. There is nothing to translate, so the only
 * checks here are emptiness and duplicates.
 */
export function addPattern(
  settings: IndexSettings,
  pattern: string,
): AddResult {
  const trimmed = pattern.trim();
  if (trimmed === "")
    return { kind: "invalid", reason: "Type a pattern to ignore" };
  if (settings.patterns.includes(trimmed)) return { kind: "duplicate" };
  if (BUILT_IN_PATTERNS.includes(trimmed)) return { kind: "duplicate" };
  if (settings.patterns.length >= MAX_PATTERNS)
    return { kind: "full", max: MAX_PATTERNS };
  return {
    kind: "added",
    settings: { ...settings, patterns: [...settings.patterns, trimmed] },
  };
}

export function removeScope(
  settings: IndexSettings,
  folder: string,
): IndexSettings {
  return {
    ...settings,
    scopes: settings.scopes.filter((scope) => scope !== folder),
  };
}

export function removePattern(
  settings: IndexSettings,
  pattern: string,
): IndexSettings {
  return {
    ...settings,
    patterns: settings.patterns.filter((entry) => entry !== pattern),
  };
}

/**
 * The roots a scan should cover.
 *
 * Detected Drive mounts come first so their rows are written before an
 * entry-capped scan runs out, since Drive is what the extension is mainly for.
 * Normalising and resolving happens in the scan, which drops contained and
 * duplicate roots.
 */
export function configuredRoots(
  settings: IndexSettings,
  driveRoots: string[],
): string[] {
  const roots = settings.includeDrive ? [...driveRoots] : [];
  for (const scope of settings.scopes)
    if (!roots.includes(scope)) roots.push(scope);
  return roots;
}

/** One line describing the configured scope, for the settings header. */
export function describeSettings(settings: IndexSettings): string {
  const parts = [
    settings.includeDrive ? "Google Drive" : undefined,
    settings.scopes.length === 1
      ? "1 extra folder"
      : settings.scopes.length > 1
        ? `${settings.scopes.length} extra folders`
        : undefined,
  ].filter(Boolean);
  return parts.length === 0 ? "Nothing to index" : parts.join(" · ");
}
