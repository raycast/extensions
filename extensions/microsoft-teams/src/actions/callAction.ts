import { prefs } from "../api/preferences";
import { runAppleScript } from "@raycast/utils";

export enum CallType {
  Video = "video",
  Audio = "audio",
}

export async function callUser(callType: CallType): Promise<void> {
  const keystroke = callType === CallType.Video ? "v" : "a";
  const desktop = prefs.urlTarget === "desktop";

  const basicCall = `
  tell application "System Events"
      keystroke "${keystroke}" using {option down, shift down}
  end tell
  `;

  const desktopCall = `
  repeat 5 times
      if application "Microsoft Teams (work or school)" is not running then
        delay 0.5
      else
        exit repeat
      end if
    end repeat
    tell application "Microsoft Teams (work or school)"
        activate
        ${basicCall}
    end tell
  `;

  await runAppleScript(desktop ? desktopCall : basicCall);
}
