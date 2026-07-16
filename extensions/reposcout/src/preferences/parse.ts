import { expandHome, parsePathList } from "../utils/path";
import type { EditorId, RawPreferences, ResolvedPreferences } from "./types";

/**
 * Pure parsing/validation of raw Raycast preferences into a
 * {@link ResolvedPreferences}. No Raycast API access happens here so every
 * defaulting and clamping rule is unit-testable.
 */

/**
 * Defaults applied when a preference is missing or invalid.
 *
 * Note there is deliberately no default for search roots: RepoScout does not
 * scan the whole machine. When no roots are configured, `roots` resolves to an
 * empty array and the UI prompts the user to pick folders (see ADR-010).
 */
const DEFAULTS = {
  maxDepth: 8,
  minDepth: 1,
  maxDepthCeiling: 32,
  ignoredDirectories:
    "node_modules,Library,.Trash,.cache,Applications,vendor,.venv,venv,dist,build,.next,.cargo",
  followSymlinks: false,
  includeBareRepos: true,
  primaryEditor: "vscode" as EditorId,
  terminalApp: "Terminal",
} as const;

/** Parse and clamp the max-depth preference. */
function parseMaxDepth(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULTS.maxDepth;
  }
  return Math.min(DEFAULTS.maxDepthCeiling, Math.max(DEFAULTS.minDepth, parsed));
}

/** Validate the editor id, falling back to the default. */
function parseEditor(raw: string | undefined): EditorId {
  return raw === "cursor" || raw === "vscode" ? raw : DEFAULTS.primaryEditor;
}

/**
 * Resolve raw preferences into a validated configuration, expanding `~`,
 * clamping depth, and de-duplicating ignored directory names.
 *
 * @param raw  Raw preference values from Raycast.
 * @param home Home directory used for tilde expansion (injectable for tests).
 */
export function resolvePreferences(raw: RawPreferences, home?: string): ResolvedPreferences {
  // No fallback to the home directory: an empty setting yields empty roots so the
  // UI can prompt the user instead of scanning the whole machine (ADR-010).
  const rootsInput = (raw.searchRoots ?? "").trim();
  const roots = parsePathList(rootsInput).map((entry) => expandHome(entry, home));

  const ignoredInput = (raw.ignoredDirectories ?? "").trim() || DEFAULTS.ignoredDirectories;
  const ignoredDirectories = new Set(parsePathList(ignoredInput));

  return {
    discovery: {
      roots,
      maxDepth: parseMaxDepth(raw.maxDepth),
      ignoredDirectories,
      followSymlinks: raw.followSymlinks ?? DEFAULTS.followSymlinks,
      includeBareRepos: raw.includeBareRepos ?? DEFAULTS.includeBareRepos,
    },
    primaryEditor: parseEditor(raw.primaryEditor),
    terminalApp: (raw.terminalApp ?? "").trim() || DEFAULTS.terminalApp,
  };
}
