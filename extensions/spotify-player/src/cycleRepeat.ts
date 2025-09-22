import { showHUD } from "@raycast/api";
import { getPlaybackState } from "./api/getPlaybackState";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { repeat } from "./api/repeat";

function cycleRepeatState(repeatState?: string) {
  switch (repeatState) {
    case "off":
      return "context";
    case "context":
      return "track";
    case "track":
      return "off";
    default:
      return "off";
  }
}

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const repeatState = playbackStateData?.repeat_state;

  const newState = cycleRepeatState(repeatState);

  try {
    await repeat(newState);
    await showHUD(`Repeat is set to ${newState}`);
  } catch {
    await showHUD("No active device");
  }
}
