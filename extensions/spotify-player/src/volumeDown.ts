import { changeVolumeWithHUD } from "./api/changeVolume";
import { getSpotifyVolume } from "./api/getSpotifyAppData";
import { getPlaybackState } from "./api/getPlaybackState";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
  // Try AppleScript first to get volume (free, no API call)
  let volume = await getSpotifyVolume();

  if (volume === undefined) {
    await setSpotifyClient();
    const playbackStateData = await getPlaybackState();
    volume = playbackStateData?.device?.volume_percent as number;
  }

  await setSpotifyClient();
  const newVolume = Math.max(volume - 10, 0);
  await changeVolumeWithHUD(newVolume);
}
