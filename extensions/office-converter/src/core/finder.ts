import { runAppleScript } from "@raycast/utils";

// get array of the selected file paths in finder (or null if no file is selected)
// getSelectedFinderItems from raycast exists, but it throws an error if Finder is not the frontmost app.
export async function getSelectedFiles(): Promise<string[] | null> {
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
