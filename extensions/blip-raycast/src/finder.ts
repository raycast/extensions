import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSelectedFinderItems } from "@raycast/api";
import { fileManagerName, isMac } from "./platform";
import { buildSelectedExplorerPathScript, getWindowsPowerShellArguments } from "./windows-scripts";

const execFileAsync = promisify(execFile);

export async function getFirstSelectedFilePath(): Promise<string> {
  if (isMac) {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      throw new Error(`No ${fileManagerName} item is selected.`);
    }
    return selectedItems[0].path;
  }

  return getFirstSelectedExplorerPath();
}

async function getFirstSelectedExplorerPath(): Promise<string> {
  const script = buildSelectedExplorerPathScript();

  try {
    const { stdout } = await execFileAsync("powershell.exe", getWindowsPowerShellArguments(script), { timeout: 10000 });
    const path = stdout.trim();
    if (!path) throw new Error("no_selection");
    return path;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("no_selection") || message.includes("no_window")) {
      throw new Error(`No ${fileManagerName} item is selected.`);
    }
    throw new Error(`Failed to read ${fileManagerName} selection: ${message}`);
  }
}
