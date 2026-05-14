import { runAppleScript } from "@raycast/utils";

export default async function () {
  const result = await runAppleScript(`
    tell application "iTerm2"
      tell current session of current window
        return contents
      end tell
    end tell
  `);
  return result;
}
