import { showHUD } from "@raycast/api";
import { stat } from "fs/promises";
import { join, extname } from "path";
import { getFinderFiles, executeRenames } from "./instant-runner";

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

    const results = withDates.map((f, i) => {
      const ext = extname(f.name);
      const name = f.name.slice(0, f.name.length - ext.length);
      return {
        original: f.name,
        renamed: `${i + 1} - ${name}${ext}`,
      };
    });

    const changed = results.filter((r) => r.original !== r.renamed);
    await executeRenames(folderPath, changed, "Enumerate by Date");
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
