import { runAppleScript } from "@raycast/utils";

export async function getArcTabUrlAndTitle(): Promise<{ tabURL: string; tabTitle: string }> {
  const output = await runAppleScript(`
    if application "Arc" is not running then return ""

    tell application "Arc"
      if (count of windows) is 0 then return ""
      return (URL of active tab of front window) & linefeed & (title of active tab of front window)
    end tell
  `);
  const [tabURL = "", ...titleParts] = output.trim().split("\n");

  return { tabURL: tabURL.trim(), tabTitle: titleParts.join("\n").trim() };
}
