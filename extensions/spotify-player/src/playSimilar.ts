import { showHUD, showToast, Toast } from "@raycast/api";
import { getTrack } from "./spotify/applescript";
import { startPlaySimilar } from "./spotify/client";
import { isAuthorized } from "./spotify/oauth";

export default async () => {
  const authorized = await isAuthorized();
  if (!authorized) {
    showHUD("⚠️ Please open any view-based command and authorize to perform the command.");
    return;
  }
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
};
