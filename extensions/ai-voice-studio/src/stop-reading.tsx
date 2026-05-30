import { showHUD } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";
import {
  clearNowPlaying as clearQwenNowPlaying,
  getNowPlaying as getQwenNowPlaying,
  requestPlaybackStop as requestQwenPlaybackStop,
} from "./utils/qwen-playback-state";
import {
  clearNowPlaying as clearMinimaxNowPlaying,
  getNowPlaying as getMinimaxNowPlaying,
  requestPlaybackStop as requestMinimaxPlaybackStop,
} from "./utils/minimax-playback-state";
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
  const [qwenState, minimaxState, mimoState, openAIState] = await Promise.all([
    getQwenNowPlaying(),
    getMinimaxNowPlaying(),
    getMimoNowPlaying(),
    getOpenAINowPlaying(),
  ]);
  await Promise.all([
    requestQwenPlaybackStop(),
    requestMinimaxPlaybackStop(),
    requestMimoPlaybackStop(),
    requestOpenAIPlaybackStop(),
  ]);

  const stopped = stopExternalPlayback();
  if (stopped) {
    await clearAllProviderStates();
    await showHUD("Playback stopped");
    return;
  }

  for (const [state, clear] of [
    [qwenState, clearQwenNowPlaying],
    [minimaxState, clearMinimaxNowPlaying],
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
  await Promise.all([clearQwenNowPlaying(), clearMinimaxNowPlaying(), clearMimoNowPlaying(), clearOpenAINowPlaying()]);
}
