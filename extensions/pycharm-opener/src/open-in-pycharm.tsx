import {
  showToast,
  Toast,
  showHUD,
  getSelectedFinderItems,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// PyCharm paths for macOS
const PYCHARM_PATHS = [
  "/Applications/PyCharm.app",
  "/Applications/PyCharm CE.app",
  "/Applications/PyCharm Professional.app",
  "/Applications/JetBrains Toolbox/PyCharm Professional.app",
  "/Applications/JetBrains Toolbox/PyCharm Community.app",
  `${os.homedir()}/Applications/PyCharm.app`,
  `${os.homedir()}/Applications/PyCharm CE.app`,
  `${os.homedir()}/Applications/PyCharm Professional.app`,
];

export default async function Command() {
  try {
    // Get selected items from Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing selected",
        message: "Select a file or folder in Finder",
      });
      return;
    }

    // Find the first folder in selection
    let folderPath: string | null = null;

    for (const item of selectedItems) {
      const itemPath = item.path;
      try {
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          folderPath = itemPath;
          break;
        }
      } catch {
        continue;
      }
    }

    // If no folder found, use parent directory of first file
    if (!folderPath && selectedItems.length > 0) {
      const firstItem = selectedItems[0].path;
      folderPath = path.dirname(firstItem);
    }

    if (!folderPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Directory not found",
        message: "Select a file or directory",
      });
      return;
    }

    // Find PyCharm installation
    const pycharmPath = await findPyCharm();

    if (!pycharmPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "PyCharm not found",
        message: "Install PyCharm or check installation paths",
      });
      return;
    }

    // Open folder in PyCharm
    await openInPyCharm(folderPath, pycharmPath);

    const folderName = path.basename(folderPath);
    await showHUD(`Opened in PyCharm: ${folderName}`);
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function findPyCharm(): Promise<string | null> {
  // Check predefined paths
  for (const pycharmPath of PYCHARM_PATHS) {
    try {
      await stat(pycharmPath);
      return pycharmPath;
    } catch {
      continue;
    }
  }

  // Try to find via mdfind (Spotlight)
  try {
    const { stdout } = await execAsync(
      'mdfind "kMDItemCFBundleIdentifier == com.jetbrains.pycharm*" | head -1',
    );
    const foundPath = stdout.trim();
    if (foundPath) {
      return foundPath;
    }
  } catch {
    // Ignore errors
  }

  // Try command line tool
  try {
    const { stdout } = await execAsync("which pycharm");
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch {
    // Ignore errors
  }

  return null;
}

async function openInPyCharm(
  folderPath: string,
  pycharmPath: string,
): Promise<void> {
  // Escape path for shell
  const escapedPath = folderPath.replace(/'/g, "'\\''");

  // Check if it's an app bundle or command line tool
  if (pycharmPath.endsWith(".app")) {
    // Use open command for .app bundles
    await execAsync(`open -a '${pycharmPath}' '${escapedPath}'`);
  } else {
    // Direct command line tool
    await execAsync(`'${pycharmPath}' '${escapedPath}'`);
  }
}
