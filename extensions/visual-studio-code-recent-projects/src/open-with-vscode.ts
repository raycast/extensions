import { closeMainWindow, getFrontmostApplication, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { build } from "./lib/preferences";
import { getCurrentFinderPath } from "./utils/apple-scripts";
import { isMac, isWin } from "./lib/utils";
import { getCurrentExplorerPath } from "./utils/win-scripts";
import { getEditorApplication } from "./utils/editor";

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

export default async function main() {
  try {
    let selectedItems: { path: string }[] = [];
    const editor = await getEditorApplication(build);

    if (isMac) {
      const currentApp = await getFrontmostApplication();
      if (currentApp.name === "Finder") {
        selectedItems = await getSelectedFinderItems();
      } else if (currentApp.name === "Path Finder") {
        const paths = await getSelectedPathFinderItems();
        selectedItems = paths.map((p) => ({ path: p }));
      }

      if (selectedItems.length === 0) {
        const currentPath = await getCurrentFinderPath();
        if (currentPath.length === 0) throw new Error("Not a valid directory");
        selectedItems = [{ path: currentPath }];
      }

      for (const item of selectedItems) {
        await open(item.path, editor);
      }
    }

    if (isWin) {
      selectedItems = await getSelectedFinderItems();

      if (selectedItems.length === 0) {
        const currentPath = await getCurrentExplorerPath();

        if (currentPath.length === 0) {
          throw new Error("Not a valid directory.");
        }

        selectedItems = [{ path: currentPath }];
      }

      for (const item of selectedItems) {
        open(item.path, editor);
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
