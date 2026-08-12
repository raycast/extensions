import { closeMainWindow, popToRoot } from "@raycast/api";

import { runAppleScript } from "./applescript";

export async function runGhosttyCommand(script: string): Promise<void> {
  await runAppleScript(script);
  await closeMainWindow();
  await popToRoot();
}
