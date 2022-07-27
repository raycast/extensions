import { showHUD, showToast, Toast } from "@raycast/api";
import { startPlaySimilar } from "./client/client";
import { currentPlayingTrack } from "./controls/spotify-applescript";

export default async function main() {
  const response = await currentPlayingTrack();

  if (response?.result) {
    const currentlyPlayingTrack = response.result;
    const trackTitle = `${currentlyPlayingTrack.artist} – ${currentlyPlayingTrack.name}`;
    if (currentlyPlayingTrack.id) {
      const trackId = currentlyPlayingTrack.id.replace("spotify:track:", "");
      await startPlaySimilar(trackId);
      showHUD(`♫ Playing Similar – ♫ ${trackTitle}`);
    }
  } else if (response?.error) {
    showToast(Toast.Style.Failure, response.error);
  }
}
