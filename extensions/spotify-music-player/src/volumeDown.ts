import { showHUD, getPreferenceValues } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { changeVolume } from "./api/changeVolume";
import { getPlaybackState } from "./api/getPlaybackState";
import { getUserFriendlyErrorMessage } from "./helpers/getError";

interface Preferences {
  volumeStep: string;
}

export default async function Command() {
  await setSpotifyClient();

  try {
    const preferences = getPreferenceValues<Preferences>();
    const step = parseInt(preferences.volumeStep || "10", 10);

    const playbackStateData = await getPlaybackState();
    const volume = playbackStateData?.device?.volume_percent ?? 50;
    const newVolume = Math.max(volume - step, 0);

    await changeVolume(newVolume);
    await showHUD(`🔉 Volume: ${newVolume}%`);
  } catch (err) {
    const message = getUserFriendlyErrorMessage(err);
    await showHUD(`❌ ${message}`);
  }
}
