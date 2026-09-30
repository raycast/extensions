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
 * Execute a list of pre-computed rename operations, persisting undo state along
 * the way. Shared by `runInstantRename` and the standalone instant commands that
 * compute their `changed` set from file metadata (date, enumeration index, etc.)
 * before delegating here.
 *
 * Partial failure handling: renames are tracked incrementally. If a rename
 * fails mid-batch (e.g. name conflict or permission error), undo state is still
 * saved for the renames that completed, and the HUD reports how many succeeded
 * and that the user can revert via "Undo Last Rename".
 */
export async function executeRenames(folderPath: string, changed: RenameResult[], actionName: string): Promise<void> {
  if (changed.length === 0) {
    await showHUD("No changes needed");
    return;
  }

  const totalToRename = changed.length;
  const completed: RenameResult[] = [];

  try {
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
    // Persist undo state for the work that did complete before the failure, so the user
    // can roll back the partial run via "Undo Last Rename".
    if (completed.length > 0) {
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

/**
 * Run an instant rename: apply transform, execute immediately, save undo state.
 * No confirmation dialog, no UI — runs instantly and shows a HUD.
 */
export async function runInstantRename(transform: (fileName: string) => string, actionName: string): Promise<void> {
  try {
    const { folderPath, files } = await getFinderFiles();

    const results: RenameResult[] = files.map((f) => ({
      original: f,
      renamed: transform(f),
    }));

    const changed = results.filter((r) => r.original !== r.renamed);
    await executeRenames(folderPath, changed, actionName);
  } catch (error) {
    // Errors from getFinderFiles or the transform — no rename has been attempted yet,
    // so there's nothing to record in undo state.
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
