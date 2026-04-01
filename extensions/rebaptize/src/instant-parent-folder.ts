import { showHUD } from "@raycast/api";
import { rename as fsRename } from "fs/promises";
import { join, basename } from "path";
import { getFinderFiles, saveUndoState } from "./instant-runner";
import { prependParentFolder } from "./rename";

export default async function () {
  try {
    const { folderPath, files } = await getFinderFiles();
    const parentName = basename(folderPath);

    const results = files.map((f) => ({
      original: f,
      renamed: prependParentFolder(f, parentName),
    }));

    const changed = results.filter((r) => r.original !== r.renamed);
    if (changed.length === 0) {
      await showHUD("No changes needed");
      return;
    }

    for (const r of changed) {
      await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
    }

    await saveUndoState({ folderPath, changes: changed, actionName: "Prepend Parent Folder", timestamp: Date.now() });
    await showHUD(`Prepended "${parentName}" to ${changed.length} files — run "Undo Last Rename" to revert`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
