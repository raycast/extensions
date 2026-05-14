import { runAppleScript } from "@raycast/utils";
import type { FileManagerProvider } from "./types";

export class BloomProvider implements FileManagerProvider {
  readonly name = "Bloom";
  readonly bundleId = "com.asiafu.Bloom";

  async getSelectedPaths(): Promise<string[]> {
    const result = (await runAppleScript(`
      tell application "Bloom"
        set selectedItems to selection of front window
        if selectedItems is missing value then return ""

        -- normalize to a list: Bloom may return a single file reference for a single selection
        if class of selectedItems is not list then
          set selectedItems to {selectedItems}
        end if

        set posixPaths to {}
        repeat with i from 1 to (count of selectedItems)
          set anItem to item i of selectedItems
          set posixPath to ""
          try
            set posixPath to POSIX path of (anItem as alias)
          on error
            try
              set posixPath to POSIX path of anItem
            end try
          end try
          if posixPath is not "" then set end of posixPaths to posixPath
        end repeat

        set AppleScript's text item delimiters to linefeed
        return posixPaths as text
      end tell
    `)) as string;
    if (!result) return [];
    return result
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter((path) => path.startsWith("/"));
  }
}
