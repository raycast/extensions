import { Toast, showToast } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { changeVolume } from "./api/changeVolume";
import { getPlaybackState } from "./api/getPlaybackState";

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const volume = playbackStateData?.device?.volume_percent as number;
  const newVolume = Math.min(volume + 10, 100);

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Setting volume to ${newVolume}%`,
    });
    await changeVolume(newVolume);
    await showToast({
      style: Toast.Style.Success,
      title: `Volume set to ${newVolume}%`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No active device",
    });
  }
}
