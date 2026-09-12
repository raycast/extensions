import { getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import type { SearchDirectory } from "../types/finder";
import type { SearchError } from "../types/search";
import type { ExtensionPreferences } from "../types/preferences";
import { normalizeDirectoryPath, resolveFallback, resolveFromSelection } from "../utils/directory-resolution";

const NOT_RUNNING = "__NOT_RUNNING__";
const NO_WINDOW = "__NO_WINDOW__";

// `target of front Finder window` fails for virtual views (Recents, smart
// folders); those errors are treated the same as having no usable window.
const FRONT_WINDOW_SCRIPT = `
if application "Finder" is not running then return "${NOT_RUNNING}"
tell application "Finder"
  if (count of Finder windows) is 0 then return "${NO_WINDOW}"
  return POSIX path of (target of front Finder window as alias)
end tell`;

function isPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("-1743") || message.toLowerCase().includes("not authorized");
}

/** Throws a `SearchError` unless `path` is an existing, readable directory. */
export async function validateDirectory(path: string): Promise<string> {
  const normalized = normalizeDirectoryPath(path);
  try {
    const info = await stat(normalized);
    if (!info.isDirectory()) {
      throw { kind: "directory-inaccessible", message: `Not a directory: ${normalized}` } satisfies SearchError;
    }
    await access(normalized, constants.R_OK);
    return normalized;
  } catch (error) {
    if (typeof error === "object" && error !== null && "kind" in error) throw error;
    throw {
      kind: "directory-inaccessible",
      message: `Cannot read ${normalized}. Check that it exists and you have permission.`,
    } satisfies SearchError;
  }
}

async function isValidDirectory(path: string | null): Promise<boolean> {
  if (!path) return false;
  try {
    await validateDirectory(path);
    return true;
  } catch {
    return false;
  }
}

type FinderDetection = { directory: SearchDirectory } | { error: SearchError };

/** Finder detection only: selection first, then the frontmost window. */
async function detectFinderDirectory(): Promise<FinderDetection> {
  try {
    const items = await getSelectedFinderItems();
    const selection = [];
    for (const item of items) {
      try {
        const info = await stat(normalizeDirectoryPath(item.path));
        selection.push({ path: item.path, isDirectory: info.isDirectory() });
        break; // only the first accessible item matters
      } catch {
        // selected item vanished or is unreadable — try the next one
      }
    }
    const resolved = resolveFromSelection(selection);
    if (resolved) return { directory: resolved };
  } catch {
    // Rejects when Finder is not frontmost or has no selection — fall through
    // to window detection, which determines the actual Finder state.
  }

  try {
    const result = (await runAppleScript(FRONT_WINDOW_SCRIPT)).trim();
    if (result === NOT_RUNNING) {
      return { error: { kind: "finder-unavailable", message: "Finder is not running. Pick a directory instead." } };
    }
    if (result === NO_WINDOW || result.length === 0) {
      return {
        error: { kind: "finder-unavailable", message: "Finder has no open window. Pick a directory instead." },
      };
    }
    return { directory: { path: await validateDirectory(result), source: "finder-window" } };
  } catch (error) {
    if (isPermissionError(error)) {
      return {
        error: {
          kind: "finder-permission-denied",
          message: "Raycast needs Automation access to Finder. Enable it in System Settings → Privacy & Security.",
        },
      };
    }
    return { error: { kind: "finder-unavailable", message: "Could not read the Finder window. Pick a directory." } };
  }
}

export type DirectoryResolution =
  | { directory: SearchDirectory; finderError: SearchError | null }
  | { needsPrompt: true; finderError: SearchError | null };

/** Full PRD resolution chain: Finder → default directory → prompt/home. */
export async function resolveSearchDirectory(preferences: ExtensionPreferences): Promise<DirectoryResolution> {
  const detection = await detectFinderDirectory();
  if ("directory" in detection) return { directory: detection.directory, finderError: null };

  const fallback = resolveFallback({
    behavior: preferences.noFinderBehavior,
    defaultDirectory: preferences.defaultDirectory,
    defaultDirectoryValid: await isValidDirectory(preferences.defaultDirectory),
    homeDirectory: homedir(),
  });
  if (fallback) return { directory: fallback, finderError: detection.error };
  return { needsPrompt: true, finderError: detection.error };
}
