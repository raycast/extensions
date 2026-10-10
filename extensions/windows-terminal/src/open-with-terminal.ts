import { closeMainWindow, getPreferenceValues, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getCurrentExplorerPath } from "./utils/win-scripts";
import { wtPath } from "./utils/constants";

function resolveDirectory(selectedPath: string): string {
  try {
    const stat = fs.statSync(selectedPath);
    if (stat.isDirectory()) {
      return selectedPath;
    }
    return path.dirname(selectedPath);
  } catch {
    return path.dirname(selectedPath);
  }
}

function launchTerminal(directory: string, quake: boolean): Promise<void> {
  const args = quake ? ["-w", "_quake", "new-tab", "-d", directory] : ["-d", directory];
  return new Promise((resolve, reject) => {
    execFile(wtPath, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export default async function main() {
  try {
    const { openProfilesInQuakeWindow: quake } = getPreferenceValues<Preferences>();

    let selectedItems: { path: string }[] = [];

    selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      const currentPath = await getCurrentExplorerPath();
      if (currentPath.length === 0) {
        throw new Error("Not a valid directory. Select a file or folder in File Explorer first.");
      }
      selectedItems = [{ path: currentPath }];
    }

    for (const item of selectedItems) {
      const directory = resolveDirectory(item.path);
      await launchTerminal(directory, quake);
    }

    await closeMainWindow();
  } catch (error) {
    await showToast({
      title: "Failed opening with Terminal",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
