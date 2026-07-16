import { expandHome, parsePathList } from "../utils/path";
import type { ResolvedPreferences } from "./types";

/**
 * Pure parsing/validation of the manifest-generated {@link Preferences} into a
 * {@link ResolvedPreferences}. No Raycast API access happens here so every
 * defaulting and clamping rule is unit-testable. Dropdown/boolean values are
 * already constrained by the generated `Preferences` type, so only the free-text
 * fields (roots, ignored dirs, depth) need validation.
 */

/** Defaults/limits applied to the free-text fields. */
const DEFAULTS = {
  maxDepth: 8,
  minDepth: 1,
  maxDepthCeiling: 32,
  ignoredDirectories: "node_modules,Library,.Trash,.cache,Applications,vendor,.venv,venv,dist,build,.next,.cargo",
} as const;

/** Parse and clamp the free-text max-depth preference. */
function parseMaxDepth(raw: string): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULTS.maxDepth;
  }
  return Math.min(DEFAULTS.maxDepthCeiling, Math.max(DEFAULTS.minDepth, parsed));
}

/**
 * Resolve preferences into a validated configuration, expanding `~`, clamping
 * depth, and de-duplicating ignored directory names.
 *
 * @param raw  Preference values from Raycast (the generated `Preferences` type).
 * @param home Home directory used for tilde expansion (injectable for tests).
 */
export function resolvePreferences(raw: Preferences, home?: string): ResolvedPreferences {
  // No fallback to the home directory: an empty setting yields empty roots so the
  // UI can prompt the user instead of scanning the whole machine (ADR-010).
  const rootsInput = (raw.searchRoots ?? "").trim();
  const roots = parsePathList(rootsInput).map((entry) => expandHome(entry, home));

  const ignoredInput = raw.ignoredDirectories.trim() || DEFAULTS.ignoredDirectories;
  const ignoredDirectories = new Set(parsePathList(ignoredInput));

  return {
    discovery: {
      roots,
      maxDepth: parseMaxDepth(raw.maxDepth),
      ignoredDirectories,
      followSymlinks: raw.followSymlinks,
      includeBareRepos: raw.includeBareRepos,
    },
    primaryEditor: raw.primaryEditor,
    terminalApp: raw.terminalApp,
  };
}
