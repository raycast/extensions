import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function CopyForegroundMailDeeplink() {
  await closeMainWindow();

  await showToast(Toast.Style.Animated, "Getting Mail deeplink");

  const result = await runAppleScript(`
    tell application "System Events"
      set frontmostApp to name of application processes whose frontmost is true
    end tell

    if frontmostApp as string is equal to "Mail" then
      tell application "Mail"
        set _sel to get selection
        set _links to {}
        repeat with _msg in _sel
          set _messageURL to "message://%3c" & _msg's message id & "%3e"
          set end of _links to _messageURL
        end repeat
        set AppleScript's text item delimiters to return
        set the clipboard to (_links as string)
        
        return "Copied email deeplink"
      end tell
    else
      return "Foreground app was " & frontmostApp & ", not Mail"
    end if
  `);

  if (result.includes("Copied email")) {
    await showToast(Toast.Style.Success, "Copied email deeplink to clipboard");
  } else {
    await showToast(Toast.Style.Failure, result);
  }
}
