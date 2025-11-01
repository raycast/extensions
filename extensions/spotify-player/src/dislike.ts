import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { safeLaunchCommandInBackground } from "./helpers/safeCommandLauncher";

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
    await removeFromMySavedTracks({
      trackIds: trackId ? [trackId] : [],
    });
    await showHUD(`Disliked ${currentlyPlayingData?.item.name}`);
    await safeLaunchCommandInBackground("current-track");
  } catch {
    await showHUD("Nothing is currently playing");
  }
}
