import { showHUD, getSelectedFinderItems } from "@raycast/api";
import { deleteDotUnderscoreFiles, isFile } from "./utils";

export default async function main() {
  try {
    const files = await getSelectedFinderItems();
    const paths = files.map((item) => item.path);
    const directoryPaths = paths.filter((path) => !isFile(path));

    if (!directoryPaths.length) {
      await showHUD("No folders selected");
      return;
    }

    directoryPaths.forEach(deleteDotUnderscoreFiles);
    await showHUD("._ files deleted");
  } catch (error) {
    console.error(error);
    await showHUD("No folders selected");
  }
}
