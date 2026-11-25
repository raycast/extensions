import { showToast, Toast, open, closeMainWindow, getSelectedFinderItems, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getCurrentFinderPath } from "./utils/apple-scripts";
import { getCurrentExplorerPath, isWindows, openInCursor } from "./utils/windows";

// Function to get selected Path Finder items
const getSelectedPathFinderItems = async () => {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;

  const paths = await runAppleScript(script);
  return paths.split(","); // Assuming the paths are comma-separated
};

const getSelectedItems = async (): Promise<{ path: string }[]> => {
  if (isWindows) {
    return getSelectedFinderItems().catch(() => []);
  }

  const currentApp = await getFrontmostApplication();
  if (currentApp.name === "Finder") {
    return getSelectedFinderItems();
  } else if (currentApp.name === "Path Finder") {
    const paths = await getSelectedPathFinderItems();
    return paths.map((p) => ({ path: p }));
  }
  return [];
};

const openWithCursor = (target: string) => (isWindows ? openInCursor(target) : open(target, "Cursor"));

export default async function main() {
  try {
    const selectedItems = await getSelectedItems();

    if (selectedItems.length === 0) {
      const currentPath = isWindows ? await getCurrentExplorerPath() : await getCurrentFinderPath();
      if (currentPath.length === 0) {
        throw new Error(isWindows ? "Switch to a File Explorer window first" : "Not a valid directory");
      }
      await openWithCursor(currentPath);
    } else {
      for (const item of selectedItems) {
        await openWithCursor(item.path);
      }
    }

    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: isWindows
        ? "Failed opening selected File Explorer item"
        : "Failed opening selected Finder or Path Finder item",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
