import { getSelectedFinderItems, open, showHUD, getFrontmostApplication, runAppleScript } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function isCursorCliAvailable(): Promise<boolean> {
  try {
    await execAsync("which cursor");
    return true;
  } catch {
    return false;
  }
}

export default async function main() {
  try {
    // Try to get selected items from Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length > 0) {
      // Open the first selected item in Cursor
      await openInCursor(selectedItems[0].path);
      return;
    }
  } catch {
    // getSelectedFinderItems throws if Finder is not frontmost
    // We'll fall back to getting the frontmost Finder window
  }

  // Fallback: Get the frontmost Finder window path using AppleScript
  try {
    const frontmostApp = await getFrontmostApplication();

    if (frontmostApp.name === "Finder") {
      const finderPath = await runAppleScript(`
        tell application "Finder"
          if (count of windows) > 0 then
            return POSIX path of (target of front window as alias)
          else
            return ""
          end if
        end tell
      `);

      if (finderPath && finderPath.trim() !== "") {
        await openInCursor(finderPath.trim());
      } else {
        await showHUD("No Finder window open");
      }
    } else {
      await showHUD("Finder is not the active application");
    }
  } catch (error) {
    console.error("Error getting Finder path:", error);
    await showHUD("Failed to get Finder path");
  }
}

async function openInCursor(path: string) {
  try {
    // Check if cursor CLI is available
    const hasCursorCli = await isCursorCliAvailable();

    if (hasCursorCli) {
      // Use cursor CLI command
      await execAsync(`cursor "${path}"`);
    } else {
      // Fallback to opening with the Cursor app
      await open(path, "Cursor");
    }

    await showHUD(`Opened in Cursor: ${path.split("/").pop()}`);
  } catch (error) {
    console.error("Error opening in Cursor:", error);
    await showHUD("Failed to open in Cursor");
  }
}
