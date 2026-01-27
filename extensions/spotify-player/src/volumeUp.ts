import { changeVolumeWithHUD } from "./api/changeVolume";
import { getPlaybackState } from "./api/getPlaybackState";
import { setSpotifyClient } from "./helpers/withSpotifyClient";

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const volume = playbackStateData?.device?.volume_percent as number;
  const newVolume = Math.min(volume + 10, 100);

  await changeVolumeWithHUD(newVolume);
}
