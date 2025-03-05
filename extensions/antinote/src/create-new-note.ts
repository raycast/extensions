import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  await runAppleScript(
    `tell application "Antinote"
      activate
      tell application "System Events"
        tell application process "Antinote"
          click menu item "create new note" of menu "file" of menu bar 1
          set frontmost to true
        end tell
      end tell
    end tell`,
  );

  await closeMainWindow({clearRootSearch: true});
}
