import { closeMainWindow, getFrontmostApplication, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { bundleIdentifier } from "./preferences";
import { getCurrentFinderPath, getSelectedPathFinderItems } from "./utils/apple-scripts";
import { getSelectedFileExplorerItems, getCurrentExplorerPath } from "./utils/win-scripts";
import { isWin, isMacOs } from "./utils";
import { getVSCodeCLI } from "./lib/vscode";

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
      // windows app's name localized, we check Explorer instead
      const isFileExplorerWindows = currentApp.path && currentApp.path.includes("Explorer.EXE");

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

        getVSCodeCLI().openPath(currentPath);
      }
    } else {
      for (const item of selectedItems) {
        getVSCodeCLI().openPath(item.path);
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
