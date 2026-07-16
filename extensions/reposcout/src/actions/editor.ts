import type { Application } from "@raycast/api";
import type { EditorId } from "../preferences/types";

/**
 * Resolves which installed macOS application to use when opening a repository in
 * an editor. Matching an app by name string alone is fragile (VS Code can be
 * installed as "Visual Studio Code", Insiders, VSCodium, or an OSS build), so we
 * look up the *actual* installed application via `getApplications()` and match
 * it here — preferring the stable bundle identifier, then the display name.
 *
 * The matching logic is pure and unit-tested; the effectful lookup/open lives in
 * the UI layer. See docs/DECISIONS.md (ADR-009).
 */

/** How to recognize a given editor among the installed applications. */
export interface EditorTarget {
  /** Bundle identifiers in priority order (most preferred first). */
  readonly bundleIds: readonly string[];
  /** Exact display names (lowercased) to accept. */
  readonly exactNames: readonly string[];
  /** Specific substrings (lowercased) to accept as a last resort. */
  readonly containsNames: readonly string[];
}

/**
 * Known bundle IDs and names for each supported editor. Multiple candidates are
 * listed so common variants (Insiders, VSCodium, OSS) resolve too.
 */
export const EDITOR_TARGETS: Record<EditorId, EditorTarget> = {
  vscode: {
    bundleIds: [
      "com.microsoft.VSCode",
      "com.microsoft.VSCodeInsiders",
      "com.vscodium.codium",
      "com.visualstudio.code.oss",
    ],
    exactNames: ["visual studio code", "visual studio code - insiders", "vscodium", "code - oss", "code"],
    // Deliberately specific to avoid matching e.g. "Xcode".
    containsNames: ["visual studio code", "vscodium"],
  },
  cursor: {
    bundleIds: ["com.todesktop.230313mzl4w4u92"],
    exactNames: ["cursor"],
    containsNames: ["cursor"],
  },
};

/**
 * Find the best-matching installed application for an editor target.
 *
 * Resolution order: bundle id (in priority order) → exact display-name → name
 * substring. Returns `null` when nothing matches, so callers can show a helpful
 * "not installed" message instead of failing silently.
 *
 * @param target The editor to look for.
 * @param apps   The installed applications (from `getApplications()`).
 */
export function findApplication(target: EditorTarget, apps: readonly Application[]): Application | null {
  for (const bundleId of target.bundleIds) {
    const byBundle = apps.find((app) => app.bundleId === bundleId);
    if (byBundle) {
      return byBundle;
    }
  }
  for (const name of target.exactNames) {
    const byExactName = apps.find((app) => app.name.toLowerCase() === name);
    if (byExactName) {
      return byExactName;
    }
  }
  for (const fragment of target.containsNames) {
    const byPartialName = apps.find((app) => app.name.toLowerCase().includes(fragment));
    if (byPartialName) {
      return byPartialName;
    }
  }
  return null;
}
