import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { skipToPrevious } from "./api/skipToPrevious";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  try {
    await skipToPrevious();
    await showHUD("Skipped to previous");
  } catch {
    await showHUD("Nothing is currently playing");
  }
}
