import { showHUD, environment } from "@raycast/api";
import { readdir, stat, rename as fsRename, writeFile } from "fs/promises";
import { join } from "path";
import { getFinderFolder } from "./finder";

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

export interface RenameResult {
  original: string;
  renamed: string;
}

interface UndoState {
  folderPath: string;
  changes: RenameResult[];
  actionName: string;
  timestamp: number;
}

/** Path to persist undo state between commands */
const UNDO_PATH = join(environment.supportPath, "undo-state.json");

/** Save undo state to disk so the "Undo Last Rename" command can read it. */
export async function saveUndoState(state: UndoState): Promise<void> {
  await writeFile(UNDO_PATH, JSON.stringify(state, null, 2));
}

/** Exported for the undo command */
export { UNDO_PATH };

/**
 * Get all non-hidden files in the current Finder folder, sorted by name.
 */
export async function getFinderFiles(): Promise<{ folderPath: string; files: string[] }> {
  const folderPath = await getFinderFolder();
  if (!folderPath) {
    throw new Error("Open a Finder window first");
  }

  const entries = await readdir(folderPath);
  const files: string[] = [];
  for (const entry of entries) {
    if (isHidden(entry)) continue;
    const s = await stat(join(folderPath, entry));
    if (s.isFile()) files.push(entry);
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  if (files.length === 0) {
    throw new Error("No files in folder");
  }

  return { folderPath, files };
}

/**
 * Run an instant rename: apply transform, execute immediately, save undo state.
 * No confirmation dialog, no UI — runs instantly and shows a HUD.
 *
 * Partial failure handling: renames are tracked incrementally. If a rename
 * fails mid-batch (e.g. name conflict or permission error), undo state is still
 * saved for the renames that completed, and the HUD tells the user how many
 * succeeded and that they can revert via "Undo Last Rename".
 */
export async function runInstantRename(transform: (fileName: string) => string, actionName: string): Promise<void> {
  let folderPath: string | null = null;
  let totalToRename = 0;
  const completed: RenameResult[] = [];

  try {
    const finderFiles = await getFinderFiles();
    folderPath = finderFiles.folderPath;
    const { files } = finderFiles;

    const results: RenameResult[] = files.map((f) => ({
      original: f,
      renamed: transform(f),
    }));

    const changed = results.filter((r) => r.original !== r.renamed);
    totalToRename = changed.length;

    if (changed.length === 0) {
      await showHUD("No changes needed");
      return;
    }

    // Execute renames, tracking each completion so partial failures still record undo state
    for (const r of changed) {
      await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
      completed.push(r);
    }

    await saveUndoState({
      folderPath,
      changes: completed,
      actionName,
      timestamp: Date.now(),
    });

    await showHUD(`${actionName}: ${completed.length} files renamed — run "Undo Last Rename" to revert`);
  } catch (error) {
    // If we already completed some renames before the failure, persist undo state for the
    // partial work so the user can roll it back via "Undo Last Rename".
    if (folderPath && completed.length > 0) {
      try {
        await saveUndoState({
          folderPath,
          changes: completed,
          actionName,
          timestamp: Date.now(),
        });
      } catch {
        // best-effort: if saveUndoState also fails, fall through to the error HUD below
      }
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    if (completed.length > 0) {
      await showHUD(
        `${actionName}: ${completed.length}/${totalToRename} renamed before error — ${errMsg}. Run "Undo Last Rename" to revert.`,
      );
    } else {
      await showHUD(errMsg);
    }
  }
}
