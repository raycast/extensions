import { showHUD } from "@raycast/api";
import { stat, rename as fsRename } from "fs/promises";
import { join, extname } from "path";
import { getFinderFiles, saveUndoState } from "./instant-runner";

export default async function () {
  try {
    const { folderPath, files } = await getFinderFiles();

    const withDates = await Promise.all(
      files.map(async (f) => {
        const s = await stat(join(folderPath, f));
        const date = s.birthtime.getTime() > 0 ? s.birthtime : s.mtime;
        return { name: f, date };
      }),
    );
    withDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    const results = withDates.map((f, i) => ({
      original: f.name,
      renamed: `${String(i + 1).padStart(3, "0")}${extname(f.name)}`,
    }));

    const changed = results.filter((r) => r.original !== r.renamed);
    if (changed.length === 0) {
      await showHUD("No changes needed");
      return;
    }

    for (const r of changed) {
      await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
    }

    await saveUndoState({ folderPath, changes: changed, actionName: "Enumerate by Date", timestamp: Date.now() });
    await showHUD(`Enumerated ${changed.length} files by date — run "Undo Last Rename" to revert`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
