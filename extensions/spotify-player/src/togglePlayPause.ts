import { showHUD } from "@raycast/api";
import { getPlaybackState } from "./api/getPlaybackState";
import { pause } from "./api/pause";
import { getErrorMessage } from "./helpers/getError";
import { play } from "./api/play";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
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
