import { showHUD, showToast, Toast } from "@raycast/api";
import { getTrack } from "./client/applescript";
import { startPlaySimilar } from "./client/client";

export default async function main() {
  try {
    const track = await getTrack();

    if (track) {
      const trackTitle = `${track.artist} – ${track.name}`;
      if (track.id) {
        const trackId = track.id.replace("spotify:track:", "");
        await startPlaySimilar({ seed_tracks: trackId });
        showHUD(`♫ Playing Similar – ♫ ${trackTitle}`);
      }
    }
  } catch (error) {
    showToast(Toast.Style.Failure, String(error));
  }
}
