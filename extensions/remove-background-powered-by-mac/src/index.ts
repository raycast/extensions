import { showHUD, getSelectedFinderItems, showInFinder, closeMainWindow, showToast, Toast } from "@raycast/api";
import { runBackgroundRemoval } from "./utils";
import path from "path";

export default async function main() {
  try {
    const paths = await getSelectedFinderItems();
    if (paths.length === 0) {
      return;
    }
    await showToast({
      style: Toast.Style.Animated,
      title: `Removing background`,
    });
    await runBackgroundRemoval({ paths: paths.map((item) => item.path) });
    await showHUD("Removed background from image");

    const resultPaths = paths.map((item) => {
      const extension = path.extname(item.path);
      const basename = path.basename(item.path, extension);

      return path.resolve(path.dirname(item.path), `${basename}-background-removed${extension}`);
    });

    await showInFinder(resultPaths[0]);
    await closeMainWindow();
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Error removing background`,
      message: String(error as Error).trim(),
    });
  }
}
