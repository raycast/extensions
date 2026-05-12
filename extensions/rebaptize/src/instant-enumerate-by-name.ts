import { showHUD } from "@raycast/api";
import { extname } from "path";
import { getFinderFiles, executeRenames } from "./instant-runner";

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
    await executeRenames(folderPath, changed, "Enumerate by Name");
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
