import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { skipToPrevious } from "./api/skipToPrevious";

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
    await skipToPrevious();
    await showHUD("Skipped to previous");
    await launchCommand({ name: "current-track", type: LaunchType.Background });
  } catch (error) {
    await showHUD("Nothing is currently playing");
  }
}
