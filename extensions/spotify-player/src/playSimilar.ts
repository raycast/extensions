import { showHUD, showToast, Toast } from "@raycast/api";
import { getTrack } from "./spotify/applescript";
import { startPlaySimilar } from "./spotify/client";

export default async function Command() {
  try {
    const track = await getTrack();

    if (!track || !track.id) {
      showToast(Toast.Style.Failure, "No track playing");
      return;
    }

    const trackTitle = `${track.artist} - ${track.name}`;
    const trackId = track.id.replace("spotify:track:", "");
    await startPlaySimilar({ seed_tracks: trackId });
    await showHUD(`♫ Playing Similar - ♫ ${trackTitle}`);
  } catch (error) {
    showToast(Toast.Style.Failure, (error as Error).message ?? "");
  }
}
