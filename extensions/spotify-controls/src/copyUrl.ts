import { showToast, ToastStyle } from "@raycast/api";
import { runAppleScriptAndReturn } from "./utils";

export default async () => {
  const script = `
    tell application "Spotify"
        set spotifyURL to spotify url of the current track
    end tell

    set AppleScript's text item delimiters to ":"
    set idPart to third text item of spotifyURL

    set the clipboard to ("https://open.spotify.com/track/" & idPart)`;

  try {
    await runAppleScriptAndReturn(script);
    await showToast(ToastStyle.Success, "Spotify", "URL copied to the clipboard.");
  } catch (_) {
    await showToast(ToastStyle.Failure, "Spotify", "Could not fetch current track.");
  }
};
