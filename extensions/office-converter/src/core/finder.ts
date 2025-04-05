import { runAppleScript } from "@raycast/utils";
import { getSelectedFinderItems } from "@raycast/api";

// get array of the selected file paths in finder using AppleScript (or null if no file is selected)
export async function getSelectedFilesLegacy(): Promise<string[] | null> {
  try {
    const result = await runAppleScript(`
      tell application "Finder"
        set selectedItems to selection as alias list
        if selectedItems is {} then
          return ""
        end if
        
        set filePaths to {}
        repeat with theItem in selectedItems
          set end of filePaths to POSIX path of theItem
        end repeat
        
        return filePaths
      end tell
    `);

    return result
      ? result
          .split(",")
          .filter(Boolean)
          .map((path: string) => path.trim())
      : null;
  } catch (error) {
    console.error("Failed to get selected files:", error);
    return null;
  }
}

// Use Raycast API.
// Note: If Finder is not the frontmost app, the API throws an error.
export async function getSelectedFiles(): Promise<string[] | null> {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      return null;
    }
    return items.map((item) => item.path);
  } catch (error) {
    return null;
  }
}
