import { showHUD } from "@raycast/api";
import { getPlaybackState } from "./api/getPlaybackState";
import { getSpotifyAppData } from "./api/getSpotifyAppData";
import { pause } from "./api/pause";
import { getErrorMessage } from "./helpers/getError";
import { play } from "./api/play";
import { checkSpotifyApp } from "./helpers/isSpotifyInstalled";
import { runSpotifyScript, SpotifyScriptType } from "./helpers/script";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
  // Try AppleScript first (free, no API call)
  const isSpotifyInstalled = await checkSpotifyApp();

  if (isSpotifyInstalled) {
    try {
      const appData = await getSpotifyAppData();

      if (appData?.state === "PLAYING") {
        await runSpotifyScript(SpotifyScriptType.Pause);
        await showHUD("Paused");
        return;
      } else if (appData?.state === "PAUSED" || appData?.state === "NOT_PLAYING") {
        await runSpotifyScript(SpotifyScriptType.Play);
        await showHUD("Playing");
        return;
      }
      // If NOT_RUNNING or undefined, fall through to Web API
    } catch {
      // AppleScript failed, fall through to Web API
    }
  }

  // Fallback to Web API
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const isPlaying = playbackStateData?.is_playing;

  if (isPlaying) {
    try {
      await pause();
      await showHUD("Paused");
    } catch (err) {
      const message = getErrorMessage(err);
      await showHUD(message);
    }
  } else {
    try {
      await play();
      await showHUD("Playing");
    } catch (err) {
      const message = getErrorMessage(err);
      await showHUD(message);
    }
  }
}
