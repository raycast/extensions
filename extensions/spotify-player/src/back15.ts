import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { safeLaunchCommandInBackground } from "./helpers/safeCommandLauncher";
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
    await seek(Math.max(currentPositionSeconds - 15, 0));
    await showHUD("Skipped back 15 seconds");
    await safeLaunchCommandInBackground("current-track");
  } catch {
    await showHUD("Nothing is currently playing");
  }
}
