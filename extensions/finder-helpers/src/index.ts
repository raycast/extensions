import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function () {
  const res = await runAppleScript(
    `tell application "System Events"
      set appName to name of the first process whose frontmost is true
      set visible of process appName to false

      set appName to name of the first process whose frontmost is true
    end tell

    tell application "Finder"
      activate

      -- if no active Finder window open one

      if (count windows) is 0 then make new Finder window
        tell window 1
          -- if view is icon view set as variable and change the current view to list view

          set oldView to current view
          if oldView is icon view then set current view to list view
        end tell
    end tell

    tell application "System Events" to tell application process "Finder"
      set theSelection to value of attribute "AXFocusedUIElement"
      -- open menu

      tell theSelection to perform action "AXShowMenu"
    end tell

    tell application "Finder"
      activate
      tell window 1
        -- if view was previously icon view change the current view back to it

        if oldView is icon view then set current view to icon view
      end tell
    end tell`,
    ["world"],
    {
      humanReadableOutput: true,
      language: "AppleScript",
    },
  );
  await showHUD(res);
}
