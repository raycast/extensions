import { runAppleScript } from "@raycast/utils";

export default async function () {
  await runAppleScript(
    `on run
      try
        main()
      on error msg number errno
        if errno is not -128 then
          activate
          display alert msg message "Error Number : " & errno
        end if
      end try
    end run

    on main()
      tell application "Finder"
        activate
        tell window 1
          set oldView to current view
          if oldView is icon view then set current view to list view
        end tell
      end tell

      tell application "System Events" to tell application process "Finder"
        set theSelection to value of attribute "AXFocusedUIElement"
        tell theSelection to perform action "AXShowMenu"
      end tell

      tell application "Finder"
        activate
        tell window 1
          if oldView is icon view then set current view to icon view
        end tell
      end tell
    end main`,
    ["world"],
  );
}
