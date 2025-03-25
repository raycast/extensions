import { runAppleScript } from "@raycast/utils";

export async function launchAppleMusic(url: string, title: string) {
  return await runAppleScript(`
    tell application "Music"
      open location "${url}"
      set name of current track to "${title.replaceAll(/"/g, "")}"
    end tell
  `);
}
