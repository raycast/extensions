import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  try {
    const script = `
      try
        -- Attempt to interact with Finder to check permissions
        tell application "Finder" to set collapsed of windows to true

        -- Hide other processes if Finder interaction succeeds
        tell application "System Events"
          set visible of processes where name is not "Finder" to false
        end tell

      on error errMsg number errNum
        return "Error " & errNum & ": " & errMsg
      end try
    `;

    const result = await runAppleScript(script);

    // Check if the script returned an error message
    if (result.startsWith("Error")) {
      throw new Error(result);
    }

    // Close Raycast if the script executed successfully and the setting is enabled
    const { alsoHideRaycast } = getPreferenceValues();
    if (alsoHideRaycast) {
      await closeMainWindow();
    }
  } catch (error) {
    // Handle errors and display appropriate messages
    if (error instanceof Error) {
      let userInstructions = "";

      if (error.message.includes("Error -1743")) {
        if (error.message.includes("System Events")) {
          userInstructions =
            "Raycast needs permission to control System Events. Allow this in System Settings > Privacy & Security > Automation.";
        } else if (error.message.includes("Finder")) {
          userInstructions =
            "Raycast needs permission to control Finder. Allow this in System Settings > Privacy & Security > Automation.";
        } else {
          userInstructions =
            "Raycast needs additional permissions. Check System Settings > Privacy & Security > Automation.";
        }
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Permission Error",
        message: userInstructions || error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unknown Error",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  }
}
