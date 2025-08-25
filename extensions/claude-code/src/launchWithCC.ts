import { getSelectedFinderItems, showToast, Toast, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { lstat } from "fs/promises";
import {
  executeInTerminal,
  showTerminalSuccessToast,
  showTerminalErrorToast,
  getManualCommand,
} from "./utils/terminalLauncher";

interface FileSystemItem {
  path: string;
}

/**
 * Intelligently select the best project
 * Priority: Directory > File
 * If multiple files are in the same directory, select the parent directory
 */
async function selectBestItem(items: FileSystemItem[]): Promise<FileSystemItem> {
  if (items.length === 0) {
    throw new Error("No items selected");
  }

  if (items.length === 1) {
    return items[0];
  }

  // Separate directories and files using filesystem checks
  const directories: FileSystemItem[] = [];
  const files: FileSystemItem[] = [];

  for (const item of items) {
    try {
      const stats = await lstat(item.path);
      if (stats.isDirectory()) {
        directories.push(item);
      } else {
        files.push(item);
      }
    } catch (error) {
      // If we can't stat the file, treat it as a file by default
      console.warn(`Failed to stat ${item.path}:`, error);
      files.push(item);
    }
  }

  // Prioritize directories
  if (directories.length > 0) {
    return directories[0];
  }

  // Check if all files are in the same directory
  if (files.length > 1) {
    const firstFileDir = files[0].path.split("/").slice(0, -1).join("/");
    const allInSameDir = files.every((file) => file.path.split("/").slice(0, -1).join("/") === firstFileDir);

    if (allInSameDir) {
      // Return parent directory
      return { path: firstFileDir };
    }
  }

  // Default to first file
  return files[0];
}

/**
 * Build Claude Code command
 */
async function buildClaudeCommand(
  item: FileSystemItem,
): Promise<{ command: string; targetDir: string; fileName: string }> {
  const fileName = item.path.split("/").pop() || item.path;

  let isFile = false;
  try {
    const stats = await lstat(item.path);
    isFile = !stats.isDirectory();
  } catch (error) {
    // If we can't stat the item, fall back to filename-based detection as a last resort
    console.warn(`Failed to stat ${item.path}:`, error);
    isFile = fileName.includes(".");
  }

  // Determine target directory
  const targetDir = isFile ? item.path.split("/").slice(0, -1).join("/") : item.path;

  // Build command
  const command = `cd "${targetDir}" && claude --add-dir "${item.path}"`;

  return { command, targetDir, fileName };
}

/**
 * Main function - no-view mode entry point
 */
export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Launching Claude Code...",
      message: "Getting Finder selection",
    });

    let items: FileSystemItem[];
    try {
      items = await getSelectedFinderItems();
    } catch {
      throw new Error(
        "Please select a file or directory in Finder first. Make sure Finder is the frontmost application.",
      );
    }

    if (items.length === 0) {
      throw new Error("No items selected in Finder. Please select a file or directory first.");
    }

    const targetItem = await selectBestItem(items);

    const { command, fileName } = await buildClaudeCommand(targetItem);

    await showToast({
      style: Toast.Style.Animated,
      title: "Launching Claude Code",
      message: `Opening ${fileName}...`,
    });

    const result = await executeInTerminal(command);

    // 5. Handle result
    if (result.success) {
      await showTerminalSuccessToast(result.terminalUsed, fileName);
    } else {
      // Copy manual command to clipboard
      const manualCommand = getManualCommand(command);
      await Clipboard.copy(manualCommand);

      await showTerminalErrorToast(manualCommand, fileName);

      showFailureToast(new Error("Check if Claude Code is installed. Command copied to clipboard."), {
        title: "Launch Failed",
      });
    }
  } catch (error) {
    console.error("Error in launchWithCC:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    showFailureToast(new Error(errorMessage), { title: "Failed to Launch Claude Code" });

    if (errorMessage.includes("Finder") || errorMessage.includes("select")) {
      setTimeout(async () => {
        try {
          await showToast({
            style: Toast.Style.Success,
            title: "How to Use",
            message: "1. Select file/folder in Finder 2. Run this command",
          });
        } catch (error) {
          console.error("Error showing usage toast:", error);
        }
      }, 2000);
    }
  }
}
