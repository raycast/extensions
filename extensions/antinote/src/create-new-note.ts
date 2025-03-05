import { runAppleScript } from "@raycast/utils";

export default async function main() {
  runAppleScript(
    `tell application "Antinote"
      activate
      tell application "System Events"
        tell application process "Antinote"
          click menu item "create new note" of menu "file" of menu bar 1
        end tell
      end tell
    end tell`,
  );
}
