import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runAppleScript } from "run-applescript";

const maximizeAllWindows = `use framework "AppKit"
use scripting additions

set {screenPosition, screenSize} to (current application's NSScreen's mainScreen()'s frame())

tell application "System Events"
  set frontmostProcess to first process where it is frontmost
  if background only of frontmostProcess is false then
    tell frontmostProcess
      set allWindows to every window
      repeat with i from 1 to count allWindows
        set thisWindow to item i of allWindows
        try
          tell thisWindow
            set position to screenPosition
            set size to screenSize
          end tell
        on error
          -- do nothing, just skip this window
        end try
      end repeat
    end tell
  end if
end tell`;

export default async function Command() {
  try {
    await runAppleScript(maximizeAllWindows);
    await showHUD("Maximized all windows");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to maximize windows" });
  }
}
