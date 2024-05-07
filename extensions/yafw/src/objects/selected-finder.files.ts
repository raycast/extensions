import { getFrontmostApplication, getSelectedFinderItems } from "@raycast/api";
import path from "path";
import { Files } from "../abstractions";
import { FsFile } from "./fs.file";

export class FinderIsNotFrontmostAppException extends Error {}

export class SelectedFinderFiles implements Files {
  /**
   * Gets currently selected videos in Finder.
   */
  list: Files["list"] = async (extensions = [".mp4", ".webm", ".gif", ".mov"]) => {
    const frontmostApp = await getFrontmostApplication();

    if (frontmostApp.name !== "Finder") {
      throw new FinderIsNotFrontmostAppException();
    }

    const paths = await getSelectedFinderItems();
    return paths
      .filter((filePath) => {
        const extension = path.extname(filePath.path);
        return extensions.includes(extension);
      })
      .map((filePath) => new FsFile(filePath.path));
  };
}
