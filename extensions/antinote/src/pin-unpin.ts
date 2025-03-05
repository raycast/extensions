import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  const result = await runAppleScript(`
    tell application "Antinote"
      activate
      tell application "System Events"
        tell application process "Antinote"
          try
            click menu item "pin antinote to top" of menu "window" of menu bar 1
            return "pinned"
          on error
            click menu item "unpin from top" of menu "window" of menu bar 1
            return "unpinned"
          end try
        end tell
      end tell
    end tell
`);

  showHUD(result == "pinned" ? "Pinned to top" : "Unpinned from top");
}
