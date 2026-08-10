// executeReaction.ts
import { runAppleScript } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

export async function executeReaction(reactionValue: string, reactionTitle: string): Promise<void> {
  const appleScript = `
    tell application "System Events"
      tell application process "ControlCenter"
        -- Check if the Green Video Menu Bar Icon exists
        set videoMenuExists to exists (first menu bar item of menu bar 1 whose value of attribute "AXIdentifier" is "com.apple.menuextra.audiovideo")
        if videoMenuExists then
          set theBarItem to (first menu bar item of menu bar 1 whose value of attribute "AXIdentifier" is "com.apple.menuextra.audiovideo")
          -- Open the Green Video Menu Bar Icon
          tell theBarItem
            perform action "AXPress"
          end tell
          -- Wait for the window to open
          set timeoutDate to (current date) + 2
          repeat while (not (window 1 exists)) and ((current date) < timeoutDate)
            delay 0.01
          end repeat
          if not (window 1 exists) then
            error "The Green Video Menu did not open after waiting."
          end if
          tell last group of group 1 of window 1
            -- Save current ‘Reactions’ State and set to enabled
            tell checkbox 1
              if it exists then
                set savedValue to value
                set value to 1
              else
                error "Reactions checkbox does not exist."
              end if
            end tell
            -- Expand the ‘Reactions’ Submenu
            tell UI element 2
              if it exists then
                perform action "AXPress"
              else
                error "Reactions submenu UI element does not exist."
              end if
            end tell
            -- Select the ‘Confetti’ Effect
            tell button 2 of group 2
              if it exists then
                perform action "AXPress"
              else
                error "Confetti button does not exist."
              end if
            end tell
            -- Collapse the ‘Reactions’ Submenu
            tell UI element 2
              if it exists then
                perform action "AXPress"
              else
                error "Reactions submenu UI element does not exist to collapse."
              end if
            end tell
            -- Set ‘Reactions’ State to saved state
            tell checkbox 1
              if it exists then
                set value to savedValue
              else
                error "Reactions checkbox does not exist to restore state."
              end if
            end tell
          end tell
          -- Close the Green Video Menu Bar Icon
          tell theBarItem
            perform action "AXPress"
          end tell
        else
          error "ERROR_MESSAGE_VIDEO_MENU_NOT_VISIBLE
        end if
      end tell
    end tell
  `;
  try {
    const result = await runAppleScript(appleScript);
    if (result === "Success") {
      await showToast(
        Toast.Style.Success,
        `${reactionTitle} Triggered!`,
        "The selected reaction has been successfully deployed.",
      );
    } else {
      console.error(`AppleScript Error: ${result}`);
      await showToast(Toast.Style.Failure, "AppleScript Error", result.replace("Error: ", ""));
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`Failed to trigger reaction: ${errorMessage}`);
    await showToast(Toast.Style.Failure, "Failed to trigger reaction", errorMessage);
  }
}
