import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { addToMySavedTracks } from "./api/addToMySavedTracks";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";
  const trackId = currentlyPlayingData?.item?.id;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  if (!isTrack) {
    return await showHUD("Liking episodes is not supported yet");
  }

  try {
    await addToMySavedTracks({
      trackIds: trackId ? [trackId] : [],
    });
    await showHUD(`Liked ${currentlyPlayingData?.item.name}`);
  } catch (error) {
    await showHUD("Nothing is currently playing");
  }
}
