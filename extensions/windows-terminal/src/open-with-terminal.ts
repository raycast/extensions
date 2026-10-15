import { closeMainWindow, getPreferenceValues, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getCurrentFinderPath } from "./utils/apple-scripts";
import { getCurrentExplorerPath } from "./utils/win-scripts";

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";

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
    execFile("wt.exe", args, (error) => {
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

    if (isMac) {
      selectedItems = await getSelectedFinderItems();

      if (selectedItems.length === 0) {
        const currentPath = await getCurrentFinderPath();
        if (currentPath.length === 0) {
          throw new Error("Not a valid directory. Select a file or folder in Finder first.");
        }
        selectedItems = [{ path: currentPath }];
      }
    } else if (isWin) {
      selectedItems = await getSelectedFinderItems();

      if (selectedItems.length === 0) {
        const currentPath = await getCurrentExplorerPath();
        if (currentPath.length === 0) {
          throw new Error("Not a valid directory. Select a file or folder in File Explorer first.");
        }
        selectedItems = [{ path: currentPath }];
      }
    } else {
      throw new Error("This command is only supported on Windows and macOS.");
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
