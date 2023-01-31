import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
  tell application "System Events"
	  tell process "Spotify"
    click menu item "Private Session" of menu 1 of menu bar item "Spotify" of menu bar 1
    set privateSession to value of attribute "AXMenuItemMarkChar" of menu item "Private Session" of menu 1 of menu bar item "Spotify" of menu bar 1
	  end tell
  end tell
  return privateSession
`);
  try {
    const result = await runAppleScript(script);
    await showToast({
      title: result === "✓" ? "Private Session Off" : "Private Session On",
    });
  } catch (_) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed toggling shuffle",
    });
  }
};
