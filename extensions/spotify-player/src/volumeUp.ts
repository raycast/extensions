import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { changeVolume } from "./api/changeVolume";
import { getPlaybackState } from "./api/getPlaybackState";

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const volume = playbackStateData?.device?.volume_percent as number;
  const newVolume = Math.min(volume + 10, 100);

  try {
    await changeVolume(newVolume);
    await showHUD(`Volume set to ${newVolume}%`);
  } catch {
    await showHUD("No active device");
  }
}
