import { getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { statSync } from "fs";

export async function getFinderSelection() {
  try {
    const items = await getSelectedFinderItems();
    if (items.length) return items[0].path;
    return null;
  } catch {
    // ignore
  }

  try {
    const path = await runAppleScript(`
      tell application "Finder"
        set theItems to selection
        if theItems is {} then return ""
        return POSIX path of (item 1 of theItems as alias)
      end tell
    `);

    if (!path.trim()) return null;
    return path.trim();
  } catch {
    return false;
  }
}

export function isDirectory(path: string): boolean {
  return statSync(path).isDirectory();
}
