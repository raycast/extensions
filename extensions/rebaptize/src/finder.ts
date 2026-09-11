import { getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import { dirname } from "path";

const execAsync = promisify(exec);

/**
 * Get the current Finder folder path.
 *
 * Strategy:
 * 1. Try getSelectedFinderItems() — if items selected, use the parent folder
 * 2. Fall back to AppleScript to get the frontmost Finder window's path
 * 3. Returns null if Finder is not open or no folder can be determined
 */
export async function getFinderFolder(): Promise<string | null> {
  // Strategy 1: selected items in Finder
  try {
    const items = await getSelectedFinderItems();
    if (items.length > 0) {
      const firstPath = items[0].path;
      const s = await stat(firstPath);
      return s.isDirectory() ? firstPath : dirname(firstPath);
    }
  } catch {
    // Finder not frontmost or no selection
  }

  // Strategy 2: AppleScript to get current Finder window
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "Finder" to get POSIX path of (target of front window as alias)'`,
    );
    const path = stdout.trim();
    if (path) return path.endsWith("/") ? path.slice(0, -1) : path;
  } catch {
    // Finder not open or no window
  }

  return null;
}
