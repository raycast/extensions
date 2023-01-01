import { runAppleScript } from "run-applescript";
import { closeMainWindow, popToRoot } from "@raycast/api";

export default async function Command() {
  const script = `

  tell application "iTerm"
    activate
    repeat until application "iTerm" is running
      delay 0.1
    end repeat
  
    if windows of application "iTerm" is {} then
      create window with default profile
    end if
  
    tell application "iTerm" to tell the first window to create tab with default profile
    activate
  end tell`;

  await popToRoot();
  await closeMainWindow();

  await runAppleScript(script);
}
