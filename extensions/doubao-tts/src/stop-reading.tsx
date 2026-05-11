import { showHUD } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";

export default async function StopReading() {
  const stopped = stopExternalPlayback();

  if (stopped) {
    await showHUD("Playback stopped");
  } else {
    await showHUD("No active playback");
  }
}
