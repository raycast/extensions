import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { containsMySavedTracks } from "./api/containsMySavedTrack";
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

  if (trackId === undefined) {
    return await showHUD("Unable to retrieve the track ID");
  }

  const trackAlreadyLiked = await containsMySavedTracks({ trackIds: [trackId] });

  if (trackAlreadyLiked[0]) {
    return await showHUD(`${currentlyPlayingData?.item.name} has already been liked`);
  }

  try {
    await addToMySavedTracks({
      trackIds: [trackId],
    });
    await showHUD(`Liked ${currentlyPlayingData?.item.name}`);
    await safeLaunchCommandInBackground("current-track");
  } catch (error) {
    await showHUD("Nothing is currently playing");
  }
}
