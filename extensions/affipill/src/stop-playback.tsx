import { closeMainWindow, showHUD } from "@raycast/api";
import { getPlaybackState, stopPlayback } from "./audio";
import { getTrackById, getTracks } from "./library";

export default async function Command() {
  const playback = await getPlaybackState();

  if (!playback) {
    await showHUD("Nothing is playing");
    await closeMainWindow();
    return;
  }

  const tracks = await getTracks();
  const track = getTrackById(tracks, playback.trackId);

  try {
    await stopPlayback();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not stop playback.";
    await showHUD(message);
    await closeMainWindow();
    return;
  }

  await showHUD(`Stopped ${track?.title ?? "track"}`);
  await closeMainWindow();
}
