import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { skipToNext } from "./api/skipToNext";
import { safeLaunchCommandInBackground } from "./helpers/safeCommandLauncher";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  if (!isTrack) {
    return await showHUD("Liking episodes is not supported yet");
  }

  try {
    await skipToNext();
    await showHUD("Skipped to next");
    await safeLaunchCommandInBackground("current-track");
  } catch (error) {
    console.error(error);
    await showHUD("Nothing is currently playing");
  }
}
