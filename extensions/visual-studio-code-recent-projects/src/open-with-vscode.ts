import { closeMainWindow, getFrontmostApplication, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { bundleIdentifier } from "./preferences";
import { isMacOs, isWin } from "./utils";
import { getCurrentFinderPath, getSelectedPathFinderItems } from "./utils/apple-scripts";
import { getCurrentExplorerPath, getSelectedFileExplorerItems } from "./utils/win-scripts";

export default async function main() {
  try {
    let selectedItems: { path: string }[] = [];
    const currentApp = await getFrontmostApplication();

    if (isMacOs) {
      if (currentApp.name === "Finder") {
        selectedItems = await getSelectedFinderItems();
      } else if (currentApp.name === "Path Finder") {
        const paths = await getSelectedPathFinderItems();
        selectedItems = paths.map((p) => ({ path: p }));
      }

      if (selectedItems.length === 0) {
        const currentPath = await getCurrentFinderPath();
        if (currentPath.length === 0) throw new Error("Not a valid directory");
        await open(currentPath, bundleIdentifier);
      } else {
        for (const item of selectedItems) {
          await open(item.path, bundleIdentifier);
        }
      }
    }

    if (isWin) {
      const isFileExplorerWindows = currentApp.name === "Windows Explorer";

      if (isFileExplorerWindows) {
        const paths = await getSelectedFileExplorerItems();
        selectedItems = paths.map((p) => ({ path: p }));
      }

      if (selectedItems.length === 0) {
        let currentPath = "";
        if (isFileExplorerWindows) {
          currentPath = await getCurrentExplorerPath();
        }

        if (currentPath.length === 0) {
          throw new Error("Not a valid directory or no selection in active application.");
        }

        await open(currentPath, bundleIdentifier);
      }
    }

    if (selectedItems.length > 0) {
      for (const item of selectedItems) {
        await open(item.path, bundleIdentifier);
      }
    }


    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening selected Finder or Path Finder item",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
