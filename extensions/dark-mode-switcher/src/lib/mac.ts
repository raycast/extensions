import { runAppleScript, showFailureToast } from "@raycast/utils";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const appleScript = `
tell application "System Events"
    tell appearance preferences 
        set dark mode to not dark mode 
    end tell
end tell
`;

export async function macToggleTheme() {
  try {
    await runAppleScript(appleScript);
  } catch {
    await showFailureToast({
      title: "Failed to toggle theme",
      style: Toast.Style.Failure,
    });
  }
}
