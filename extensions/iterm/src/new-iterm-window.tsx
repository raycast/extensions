import { runAppleScript } from "run-applescript";
import { closeMainWindow, popToRoot } from "@raycast/api";

export default async function Command() {
  const script = `
  tell application "iTerm"
    if application "iTerm" is running then
      create window with default profile
    end if
    activate
  end tell`;

  await popToRoot();
  await closeMainWindow();

  await runAppleScript(script);
}
