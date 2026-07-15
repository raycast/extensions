import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { seek } from "./api/seek";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  try {
    const currentPositionSeconds = (currentlyPlayingData?.progress_ms || 0) / 1000;
    await seek(Math.max(currentPositionSeconds - 15, 0), currentlyPlayingData?.item?.duration_ms);
    await showHUD("Skipped back 15 seconds");
  } catch {
    await showHUD("Nothing is currently playing");
  }
}
