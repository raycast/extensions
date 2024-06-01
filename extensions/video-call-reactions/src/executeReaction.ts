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
          -- Attempt to open the Green Video Menu Bar Icon
          try
            tell theBarItem
              perform action "AXPress"
            end tell
            -- Check if the Reactions submenu can be accessed
            if exists last group of group 1 of window 1 then
              tell last group of group 1 of window 1
                -- Save current ‘Reactions’ State and set to enabled
                if exists checkbox 1 then
                  tell checkbox 1
                    set savedValue to value
                    set value to 1
                  end tell
                  -- Expand the ‘Reactions’ Submenu
                  if exists UI element 2 then
                    tell UI element 2
                      perform action "AXPress"
                    end tell
                    -- Select the reaction based on the value
                    if exists ${reactionValue} then
                      tell ${reactionValue}
                        perform action "AXPress"
                      end tell
                      -- Collapse the ‘Reactions’ Submenu
                      tell UI element 2
                        perform action "AXPress"
                      end tell
                      -- Set ‘Reactions’ State to saved state
                      tell checkbox 1
                        set value to savedValue
                      end tell
                      -- Close the Green Video Menu Bar Icon
                      tell theBarItem
                        perform action "AXPress"
                      end tell
                      return "Success"
                    else
                      return "Error: Specified reaction button not found."
                    end if
                  else
                    return "Error: Reactions submenu UI element not found."
                  end if
                else
                  return "Error: Reactions checkbox not found."
                end if
              end tell
            else
              return "Error: Unable to access Reactions submenu."
            end if
          on error
            return "Error: Failed to open the Green Video Menu Bar Icon."
          end try
        else
          return "Error: The green video menu icon is not visible."
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
      // Directly display the result from the AppleScript as the error message
      await showToast(Toast.Style.Failure, result, result);
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    await showToast(Toast.Style.Failure, "Failed to trigger reaction", errorMessage);
  }
}
