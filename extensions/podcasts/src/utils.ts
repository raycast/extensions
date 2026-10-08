import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function runAppleScriptAndCloseWindow(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

export function buildPodcastScript(scriptToRunOnceActivated: string): string {
  return `
    set old to (path to frontmost application as text)
    tell application "Podcasts"
      reopen
      activate
    end tell
    tell application "System Events" to tell process "Podcasts"
      ${scriptToRunOnceActivated}
      delay 0.1
      set visible to false
    end tell
    activate application old
`;
}

export async function togglePlayPause() {
  // menu bar 1 -> top bar
  // menu item 6 -> Controls (becomes menu 1)
  // menu item 1 -> Play / Pause
  const playScript = `
    tell menu bar item 6 of menu bar 1
      click
      click menu item 1 of menu 1
    end tell  
`;

  const script = buildPodcastScript(playScript);
  await runAppleScriptAndCloseWindow(script);
}
