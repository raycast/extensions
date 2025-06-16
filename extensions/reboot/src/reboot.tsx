import { showHUD } from "@raycast/api";

import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  await runAppleScript(`tell application "System Events" to restart`);
  await showHUD("Rebooting 🔁");
}
