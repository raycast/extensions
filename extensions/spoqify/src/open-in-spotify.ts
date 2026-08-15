import { runAppleScript } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async function Command() {
  try {
    const script = buildScriptEnsuringSpotifyIsRunning(`
      tell application "Google Chrome"
        activate
        set theURL to URL of active tab of first window
        return theURL
      end tell
    `);
    await runAppleScript(script);

    const theURL = await runAppleScript(script);
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
