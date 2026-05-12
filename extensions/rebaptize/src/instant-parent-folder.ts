import { showHUD } from "@raycast/api";
import { basename } from "path";
import { getFinderFiles, executeRenames } from "./instant-runner";
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
    await executeRenames(folderPath, changed, "Prepend Parent Folder");
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}
