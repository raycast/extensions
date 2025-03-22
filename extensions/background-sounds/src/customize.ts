import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  const res = await runAppleScript(
    `
tell application "System Events"
  do shell script "open 'x-apple.systempreferences:com.apple.preference.universalaccess?Audio'"
  return true
end tell
`,
    [],
  );

  if (!res) {
    await showHUD("Something went wrong. Please try again.");
  }
}
