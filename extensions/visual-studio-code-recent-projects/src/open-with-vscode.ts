import { closeMainWindow, getFrontmostApplication, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { bundleIdentifier } from "./preferences";
import { getCurrentFinderPath, getSelectedPathFinderItems, getActiveExplorerPath } from "./utils/scripts";
import { isMacOS, isWindows } from "./utils";

export default async function main() {
  try {
    let selectedItems: { path: string }[] = [];
    const currentApp = await getFrontmostApplication();

    if (isMacOS && currentApp.name === "Finder") {
      selectedItems = await getSelectedFinderItems();
    } else if (isMacOS && currentApp.name === "Path Finder") {
      const paths = await getSelectedPathFinderItems();
      selectedItems = paths.map((p) => ({ path: p }));
    }

    if (selectedItems.length === 0 && isMacOS) {
      const currentPath = await getCurrentFinderPath();
      if (currentPath.length === 0) throw new Error("Not a valid directory");
      await open(currentPath, bundleIdentifier);
    } else if (selectedItems.length === 0 && isWindows) {
      const currentPath = await getActiveExplorerPath();
      if (currentPath.length === 0) throw new Error("Not a valid directory");
      await open(currentPath, bundleIdentifier);
    } else {
      for (const item of selectedItems) {
        await open(item.path, bundleIdentifier);
      }
    }

    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: isMacOS ? "Failed opening selected Finder or Path Finder item" : "Failed opening selected Explorer item",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
