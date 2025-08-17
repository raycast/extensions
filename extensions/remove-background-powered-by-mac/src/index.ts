import {
  Clipboard,
  showHUD,
  getSelectedFinderItems,
  showInFinder,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { runBackgroundRemoval, storeClipboardImageAsTemporaryFile } from "./utils";
import path from "path";

export default async function main() {
  try {
    let paths: string[] = [];
    let newFilePath: string | undefined;

    const { file } = await Clipboard.read();

    if (file) {
      newFilePath = await storeClipboardImageAsTemporaryFile(file);

      paths = [newFilePath];
    } else {
      const finderItems = await getSelectedFinderItems();

      if (finderItems.length > 0) {
        paths = finderItems.map((item) => item.path);
      }
    }

    if (paths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image selected",
        message: "Please select an image in Finder or copy one to clipboard",
      });

      return;
    }

    await runBackgroundRemoval({ paths });

    const resultPaths = paths.map((itemPath) => {
      const extension = path.extname(itemPath);
      const basename = path.basename(itemPath, extension);

      return path.resolve(path.dirname(itemPath), `${basename}-background-removed${extension}`);
    });

    if (newFilePath) {
      await Clipboard.copy({
        file: resultPaths[0],
      });
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Removing background",
    });

    await showHUD("Removed background from image");

    if (!newFilePath) {
      await showInFinder(resultPaths[0]);
    }

    await closeMainWindow();
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Error removing background",
      message: String(error as Error).trim(),
    });
  }
}
