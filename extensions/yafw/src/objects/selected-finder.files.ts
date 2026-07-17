import { getFrontmostApplication, getSelectedFinderItems } from "@raycast/api";
import { Files } from "../abstractions";
import { isFileFormatSupported } from "../utils";
import { FsFile } from "./fs.file";

export class FinderIsNotFrontmostAppException extends Error {}

export class SelectedFinderFiles implements Files {
  /**
   * Gets currently selected videos in Finder.
   */
  list: Files["list"] = async () => {
    const frontmostApp = await getFrontmostApplication();

    if (frontmostApp.name !== "Finder") {
      throw new FinderIsNotFrontmostAppException();
    }

    const paths = await getSelectedFinderItems();
    return paths
      .filter((filePath) => isFileFormatSupported(filePath.path))
      .map((filePath) => new FsFile(filePath.path));
  };
}
