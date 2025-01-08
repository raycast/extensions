import { runAppleScript } from "run-applescript";
import { popToRoot } from "@raycast/api";

export default async function Command() {
  const script = `
  tell application "System Events"
    set isGhosttyRunning to exists (processes where name is "Ghostty")
  end tell

  tell application "Ghostty"
    if not isGhosttyRunning then
      activate
    else
      -- If Ghostty is already running, activate Finder first then activate Ghostty and send Cmd+N to create new window
      tell application "Finder" to activate
      activate
      tell application "System Events"
        tell process "Ghostty"
          keystroke "t" using {command down}
        end tell
      end tell
    end if
  end tell`;

  await runAppleScript(script);
  await popToRoot();
}
