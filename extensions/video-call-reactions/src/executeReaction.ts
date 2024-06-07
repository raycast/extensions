import { runAppleScript } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import {
  ERROR_VIDEO_MENU_NOT_VISIBLE,
  ERROR_REACTIONS_CHECKBOX_MISSING,
  ERROR_REACTIONS_SUBMENU_MISSING,
  ERROR_REACTION_BUTTON_MISSING,
  MESSAGE_UNKNOWN_ERROR,
  MESSAGE_REACTION_DEPLOYED,
  STATUS_SUCCESS,
  REACTION_CONFETTI,
  showConfetti,
  Preferences,
  MESSAGE_PLEASE_WAIT,
  TITLE_REACTION_ERROR,
} from "./constants";

export async function executeReaction(reactionCommand: string, preferences: Preferences): Promise<void> {
  showToast({
    style: Toast.Style.Animated,
    title: `Triggering ${preferences.defaultReaction}`,
    message: MESSAGE_PLEASE_WAIT,
  });

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
      tell last group of group 1 of window 1
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

  try {
    const result = await runAppleScript(appleScript);
    if (result === STATUS_SUCCESS) {
      if (preferences.showConfetti && preferences.defaultReaction === REACTION_CONFETTI) {
        showConfetti(preferences, false);
      }
      showToast({
        style: Toast.Style.Success,
        title: `${preferences.defaultReaction} Triggered!`,
        message: MESSAGE_REACTION_DEPLOYED,
      });
    } else {
      throw new Error(result);
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : TITLE_REACTION_ERROR,
      message: error instanceof Error ? error.message : MESSAGE_UNKNOWN_ERROR,
    });
    throw error; // Rethrow the error to be handled by the caller
  }
}
