import { showHUD } from "@raycast/api";
import { getPlaybackState } from "./api/getPlaybackState";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { repeat } from "./api/repeat";

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const repeatState = playbackStateData?.repeat_state;

  try {
    await repeat(repeatState === "off" ? "context" : "off");
    await showHUD(`Repeat is ${repeatState === "off" ? "on" : "off"}`);
  } catch (error) {
    await showHUD("No active device");
  }
}
