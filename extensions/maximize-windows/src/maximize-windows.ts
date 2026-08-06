import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runAppleScript } from "run-applescript";

const maximizeAllWindows = `use framework "AppKit"
use scripting additions

set mainScreen to current application's NSScreen's mainScreen()
set fullFrame to mainScreen's frame()
set visFrame to mainScreen's visibleFrame()

set fullOrigin to item 1 of fullFrame
set fullSize to item 2 of fullFrame
set visOrigin to item 1 of visFrame
set visSize to item 2 of visFrame

-- visibleFrame excludes the menu bar and Dock. AppKit uses a bottom-left
-- origin while System Events uses a top-left origin, so convert the Y value.
set screenX to item 1 of visOrigin
set screenY to ((item 2 of fullOrigin) + (item 2 of fullSize)) - ((item 2 of visOrigin) + (item 2 of visSize))
set screenPosition to {screenX, screenY}
set screenSize to visSize

set resizedCount to 0
set totalCount to 0

tell application "System Events"
  set frontmostProcess to first process where it is frontmost
  if background only of frontmostProcess is false then
    tell frontmostProcess
      set allWindows to every window
      repeat with i from 1 to count allWindows
        set thisWindow to item i of allWindows
        set totalCount to totalCount + 1
        try
          tell thisWindow
            set position to screenPosition
            set size to screenSize
          end tell
          set resizedCount to resizedCount + 1
        on error
          -- window can't be moved or resized; skip it
        end try
      end repeat
    end tell
  end if
end tell

return (resizedCount as text) & "/" & (totalCount as text)`;

export default async function Command() {
  try {
    const result = await runAppleScript(maximizeAllWindows);
    const [resizedRaw, totalRaw] = result.trim().split("/");
    const resized = Number(resizedRaw);
    const total = Number(totalRaw);

    if (!Number.isFinite(total) || total === 0) {
      await showHUD("No windows to maximize");
    } else if (Number.isFinite(resized) && resized < total) {
      await showHUD(`Maximized ${resized} of ${total} windows`);
    } else {
      await showHUD("Maximized all windows");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to maximize windows" });
  }
}
