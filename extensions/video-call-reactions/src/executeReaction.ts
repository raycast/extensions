import { runAppleScript } from "@raycast/utils";
import {
  ERROR_VIDEO_MENU_NOT_VISIBLE,
  ERROR_REACTIONS_CHECKBOX_MISSING,
  ERROR_REACTIONS_SUBMENU_MISSING,
  ERROR_REACTION_BUTTON_MISSING,
  STATUS_SUCCESS,
} from "./common";

export async function executeReaction(reactionCommand: string): Promise<void> {
  const appleScript = `
  tell application "System Events"
    tell application process "ControlCenter"
      set videoMenuExists to exists (first menu bar item of menu bar 1 whose value of attribute "AXIdentifier" is "com.apple.menuextra.audiovideo")
      if videoMenuExists then
        set theBarItem to (first menu bar item of menu bar 1 whose value of attribute "AXIdentifier" is "com.apple.menuextra.audiovideo")
        tell theBarItem
          perform action "AXPress"
        end tell
        set timeoutDate to (current date) + 2
        repeat while (not (window 1 exists)) and ((current date) < timeoutDate)
          delay 0.01
        end repeat
        if not (window 1 exists) then
          return "${ERROR_VIDEO_MENU_NOT_VISIBLE}"
        end if
        tell group -2 of group 1 of window 1
          tell checkbox 1
            if it exists then
              set savedValue to value
              set value to 1
            else
              return "${ERROR_REACTIONS_CHECKBOX_MISSING}"
            end if
          end tell
          tell UI element 2
            if it exists then
              perform action "AXPress"
            else
              return "${ERROR_REACTIONS_SUBMENU_MISSING}"
            end if
          end tell
          tell ${reactionCommand}
            if it exists then
              perform action "AXPress"
            else
              return "${ERROR_REACTION_BUTTON_MISSING}"
            end if
          end tell
          tell UI element 2
            if it exists then
              perform action "AXPress"
            else
              return "${ERROR_REACTIONS_SUBMENU_MISSING}"
            end if
          end tell
          tell checkbox 1
            if it exists then
              set value to savedValue
            else
              return "${ERROR_REACTIONS_CHECKBOX_MISSING}"
            end if
          end tell
        end tell
        tell theBarItem
          perform action "AXPress"
        end tell
      else
        return "${ERROR_VIDEO_MENU_NOT_VISIBLE}"
      end if
    end tell
  end tell
  return "${STATUS_SUCCESS}"
  `;

  // Execute the AppleScript and handle the result.
  const result = await runAppleScript(appleScript);
  if (result !== STATUS_SUCCESS) {
    throw new Error(result);
  }
}
