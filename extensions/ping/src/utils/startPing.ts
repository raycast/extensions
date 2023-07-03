import { runAppleScript } from "@raycast/utils";

export default async function startPing(content: string) {
  const endTime = 5;
  const res = await runAppleScript(`
    tell application "Terminal"
      activate
      do script "ping -c ${endTime} ${content}"
    end tell
  `);
  return res;
}
