import { showHUD } from "@raycast/api";

import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  await runAppleScript(`
tell application "System Events"
    log out
end tell
`);
  await showHUD("Bye 🚪");
  await runAppleScript(`
tell application "System Events"
    log out
end tell
`);
}
