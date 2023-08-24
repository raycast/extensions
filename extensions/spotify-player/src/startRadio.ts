import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { startRadio } from "./api/startRadio";
import { getErrorMessage } from "./helpers/getError";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";
  const trackId = currentlyPlayingData?.item?.id;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  if (!isTrack && !trackId) {
    return await showHUD("Radio based on episodes isn't available yet");
  }

  try {
    await startRadio({
      trackIds: trackId ? [trackId] : undefined,
    });
    await showHUD("Playing Radio");
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
