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
 */
export async function runInstantRename(transform: (fileName: string) => string, actionName: string): Promise<void> {
  try {
    const { folderPath, files } = await getFinderFiles();

    const results: RenameResult[] = files.map((f) => ({
      original: f,
      renamed: transform(f),
    }));

    const changed = results.filter((r) => r.original !== r.renamed);

    if (changed.length === 0) {
      await showHUD("No changes needed");
      return;
    }

    // Execute renames
    for (const r of changed) {
      await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
    }

    // Save undo state to disk
    await saveUndoState({
      folderPath,
      changes: changed,
      actionName,
      timestamp: Date.now(),
    });

    await showHUD(`${actionName}: ${changed.length} files renamed — run "Undo Last Rename" to revert`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
