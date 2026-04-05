import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { statSync } from "fs";

type FinderResult = { type: "path"; path: string } | { type: "empty" } | { type: "permission_error" };

export async function getFinderSelection(): Promise<FinderResult> {
  try {
    const items = await getSelectedFinderItems();
    if (items.length) return { type: "path", path: items[0].path };
    return { type: "empty" };
  } catch {
    // ignore errors
  }

  try {
    const path = await runAppleScript(`
      tell application "Finder"
        set theItems to selection
        if theItems is {} then return ""
        return POSIX path of (item 1 of theItems as alias)
      end tell
    `);

    if (!path.trim()) return { type: "empty" };
    return { type: "path", path: path.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("-1743") || message.includes("not allowed")) {
      await showHUD("⚠️ Go to System Settings → Privacy & Security → Automation → enable Finder for Raycast");
    }
    return { type: "permission_error" };
  }
}

export function isDirectory(path: string): boolean {
  return statSync(path).isDirectory();
}
