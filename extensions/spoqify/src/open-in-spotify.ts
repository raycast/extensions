import { runAppleScript } from "@raycast/utils";
import { Clipboard, showToast, Toast } from "@raycast/api";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async function Command() {
  try {
    const theURL = await Clipboard.readText();
    const spotifyOpen = buildScriptEnsuringSpotifyIsRunning(`
  tell application "Spotify"
    activate
    open location "${theURL}"
  end tell
`);
    return await runAppleScript(spotifyOpen);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open Spotify URL", (error as Error).message);
    return;
  }
}
