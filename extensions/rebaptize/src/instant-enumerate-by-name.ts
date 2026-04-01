import { showHUD } from "@raycast/api";
import { rename as fsRename } from "fs/promises";
import { join, extname } from "path";
import { getFinderFiles, saveUndoState } from "./instant-runner";

export default async function () {
  try {
    const { folderPath, files } = await getFinderFiles();

    const results = files.map((f, i) => {
      const ext = extname(f);
      const name = f.slice(0, f.length - ext.length);
      return {
        original: f,
        renamed: `${i + 1} - ${name}${ext}`,
      };
    });

    const changed = results.filter((r) => r.original !== r.renamed);
    if (changed.length === 0) {
      await showHUD("No changes needed");
      return;
    }

    for (const r of changed) {
      await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
    }

    await saveUndoState({ folderPath, changes: changed, actionName: "Enumerate by Name", timestamp: Date.now() });
    await showHUD(`Enumerated ${changed.length} files — run "Undo Last Rename" to revert`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
