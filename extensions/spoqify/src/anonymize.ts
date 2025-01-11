import { runAppleScript } from "@raycast/utils";
import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async function Command() {
  try {
    const script = buildScriptEnsuringSpotifyIsRunning(`
      tell application "Spotify"
        set spotifyURL to spotify url of the current track
        set AppleScript's text item delimiters to ":"
        set idPart to third text item of spotifyURL
        set the clipboard to ("https://open.spoqify.com/track/" & idPart)
      end tell
    `);
    await runAppleScript(script);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to get Spotify URL", (error as Error).message);
    return;
  }

  try {
    const text = await Clipboard.readText();
    await open(text as string);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to read from clipboard", (error as Error).message);
    return;
  }

  try {
    const urlScript = `
      tell application "Google Chrome"
        activate
        delay 5
        set theURL to URL of active tab of first window
        return theURL
      end tell
    `;
    const theURL = await runAppleScript(urlScript);
    await Clipboard.copy(theURL);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to get URL from Google Chrome", (error as Error).message);
    return;
  }
}
