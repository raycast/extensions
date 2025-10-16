import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
    set spotifyURL to spotify url of the current track

    set AppleScript's text item delimiters to ":"
    set idPart to third text item of spotifyURL

    set the clipboard to ("https://open.spotify.com/track/" & idPart)
  `);

  try {
    await runAppleScript(script);
    await showToast({
      title: "Copied URL to clipboard",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed copying URL",
    });
  }
};
