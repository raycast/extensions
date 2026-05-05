import { showHUD } from "@raycast/api";
import { getPlaybackState } from "./api/getPlaybackState";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { shuffle } from "./api/shuffle";

export default async function Command() {
  await setSpotifyClient();

  const playbackStateData = await getPlaybackState();
  const shuffleState = playbackStateData?.shuffle_state;

  try {
    await shuffle(!shuffleState);
    await showHUD(`Shuffle is ${shuffleState ? "off" : "on"}`);
  } catch {
    await showHUD("No active device");
  }
}
