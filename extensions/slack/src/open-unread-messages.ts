import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { buildScriptEnsuringSlackIsRunning } from "./shared/utils";

export default async function Command() {
  await showHUD(`Open unread messages`);
  await runAppleScript(
    buildScriptEnsuringSlackIsRunning(`
      tell application "System Events" to tell process "Slack" to keystroke "A" using {command down, shift down}
    `),
  );
  return null;
}
