import { showHUD } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";
import {
  clearNowPlaying as clearQwenNowPlaying,
  getNowPlaying as getQwenNowPlaying,
  requestPlaybackStop as requestQwenPlaybackStop,
} from "./utils/qwen-playback-state";
import {
  clearNowPlaying as clearMimoNowPlaying,
  getNowPlaying as getMimoNowPlaying,
  requestPlaybackStop as requestMimoPlaybackStop,
} from "./utils/mimo-playback-state";
import {
  clearNowPlaying as clearOpenAINowPlaying,
  getNowPlaying as getOpenAINowPlaying,
  requestPlaybackStop as requestOpenAIPlaybackStop,
} from "./utils/openai-playback-state";

export default async function StopReading() {
  const [qwenState, mimoState, openAIState] = await Promise.all([
    getQwenNowPlaying(),
    getMimoNowPlaying(),
    getOpenAINowPlaying(),
  ]);
  await Promise.all([requestQwenPlaybackStop(), requestMimoPlaybackStop(), requestOpenAIPlaybackStop()]);

  const stopped = stopExternalPlayback();
  if (stopped) {
    await clearAllProviderStates();
    await showHUD("Playback stopped");
    return;
  }

  for (const [state, clear] of [
    [qwenState, clearQwenNowPlaying],
    [mimoState, clearMimoNowPlaying],
    [openAIState, clearOpenAINowPlaying],
  ] as const) {
    if (state?.status === "playing" || state?.status === "synthesizing") {
      await clear();
      await showHUD("Playback stopped");
      return;
    }
  }

  await showHUD("No active playback");
}

async function clearAllProviderStates(): Promise<void> {
  await Promise.all([clearQwenNowPlaying(), clearMimoNowPlaying(), clearOpenAINowPlaying()]);
}
