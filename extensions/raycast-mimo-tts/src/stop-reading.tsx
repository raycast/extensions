import { showHUD } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";
import { clearNowPlaying, requestPlaybackStop } from "./utils/mimo-playback-state";

export default async function StopReading() {
  const stopped = stopExternalPlayback();
  await requestPlaybackStop();
  await clearNowPlaying();
  await showHUD(stopped ? "Stopped" : "Nothing was playing");
}
