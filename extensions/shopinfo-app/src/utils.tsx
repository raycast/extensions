import { runAppleScript } from "@raycast/utils";

export const getBrowserURL = async (appName: string) => {
  try {
    const getBrowserURLScript = `
      set inp to "${appName}"
      tell application "System Events"
          if inp is "Google Chrome" then
              tell application "Google Chrome" to return URL of active tab of front window 
          else if inp is "Arc" then
              tell application "Arc" to return URL of active tab of front window 
          else if inp is "Brave Browser" then
              tell application "Brave Browser" to return URL of active tab of front window 
          else if inp is "Safari" then
              tell application "Safari" to return URL of front document
          else if inp is "Firefox" or inp is "Zen Browser" then
              tell application "System Events"
                  keystroke "l" using command down
                  keystroke "c" using command down
              end tell
              delay 0.5
              return the clipboard
          else
              return
          end if
      end tell
`;

    return await runAppleScript(getBrowserURLScript);
  } catch {
    return null;
  }
};
