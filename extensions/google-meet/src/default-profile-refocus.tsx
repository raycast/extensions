import { showHUD, Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { getMeetTab, openMeetTabDefaultProfile } from "./helpers";
import { showFailureToast } from "@raycast/utils";

async function switchToPreviousApp(): Promise<void> {
  // Use AppleScript to perform Command+Tab (switch to previous application)
  const script = `
    tell application "System Events"
      keystroke tab using {command down}
    end tell
  `;

  await runAppleScript(script);
}

export default async function main() {
  try {
    await openMeetTabDefaultProfile();
    await new Promise((r) => setTimeout(r, 500));
    const meetTab = await getMeetTab();

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");

    // Switch back to the previous application
    await switchToPreviousApp();
  } catch (err) {
    await showFailureToast(err, {
      title: "Couldn't copy to clipboard",
    });
  }
}
