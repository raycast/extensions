import { showHUD } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";
import { clearNowPlaying, getNowPlaying, requestPlaybackStop } from "./utils/playback-state";

export default async function StopReading() {
  const state = await getNowPlaying();
  if (state?.status === "playing" || state?.status === "synthesizing") {
    await requestPlaybackStop();
  }
  const stopped = stopExternalPlayback();
  await clearNowPlaying();

  if (state && (stopped || state.status === "playing" || state.status === "synthesizing")) {
    const chunkInfo =
      state.totalChunks > 1 && state.currentChunk >= 0 ? ` · chunk ${state.currentChunk + 1}/${state.totalChunks}` : "";
    await showHUD(`Stopped ${state.voiceName}${chunkInfo}`);
    return;
  }

  if (stopped) {
    await showHUD("Playback stopped");
    return;
  }

  await showHUD("No active playback");
}
