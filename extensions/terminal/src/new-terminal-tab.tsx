import { runAppleScript } from "run-applescript";
import { closeMainWindow, popToRoot } from "@raycast/api";

export default async function Command() {
  await popToRoot();
  await closeMainWindow();

  const script = `
    activate application "Terminal"

    tell application "System Events" to tell process "Terminal" to keystroke "t" using command down
  `;

  await runAppleScript(script);
}
