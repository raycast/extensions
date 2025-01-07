import { runAppleScript } from "run-applescript";
import { popToRoot } from "@raycast/api";

export default async function Command() {
  const script = `
  tell application "Ghostty"
    if it is running then
      activate
      tell application "System Events" to keystroke "n" using {command down}
    else
      activate
    end if
  end tell`;

  await runAppleScript(script);
  await popToRoot();
}
