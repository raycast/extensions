import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { requestExternalStop, stopExternalPlayback } from "./utils/audio-player";
import { clearPlaybackState, readPlaybackState } from "./utils/playback-state";
import { getLastReadingSession } from "./utils/reading-session";
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
  const [mimoState, openAIState, liveState, lastSession] = await Promise.all([
    getMimoNowPlaying(),
    getOpenAINowPlaying(),
    readPlaybackState(),
    getLastReadingSession(),
  ]);
  await Promise.all([requestMimoPlaybackStop(), requestOpenAIPlaybackStop()]);

  if (liveState?.phase === "synthesizing" || liveState?.phase === "playing") {
    requestExternalStop();
    stopExternalPlayback();
    await Promise.all([clearPlaybackState(), clearMimoNowPlaying(), clearOpenAINowPlaying()]);
    await showHUD("Playback stopped");
    return;
  }

  const stopped = stopExternalPlayback();

  if (stopped) {
    await Promise.all([clearPlaybackState(), clearMimoNowPlaying(), clearOpenAINowPlaying()]);
    await showHUD("Playback stopped");
    return;
  }

  if (mimoState?.status === "playing" || mimoState?.status === "synthesizing") {
    await clearMimoNowPlaying();
    await showHUD("Playback stopped");
    return;
  }

  if (openAIState?.status === "playing" || openAIState?.status === "synthesizing") {
    await clearOpenAINowPlaying();
    await showHUD("Playback stopped");
    return;
  }

  // Nothing playing right now — try to surface a useful next action instead
  // of silently flashing "No active playback".
  const pausedAt =
    liveState && liveState.phase === "stopped"
      ? `${liveState.chunkIndex + 1}/${liveState.chunkTotal}`
      : lastSession && lastSession.nextChunkIndex < lastSession.chunks.length
        ? `${lastSession.nextChunkIndex + 1}/${lastSession.chunks.length}`
        : null;

  if (pausedAt) {
    await showToast({
      style: Toast.Style.Success,
      title: "No active playback",
      message: `Last reading paused at ${pausedAt}`,
      primaryAction: {
        title: "Resume Last Reading",
        onAction: async () => {
          try {
            await launchCommand({ name: "resume-reading", type: LaunchType.UserInitiated });
          } catch {
            // ignore launch failures; the user can re-trigger manually
          }
        },
      },
    });
    return;
  }

  await showHUD("No active playback");
}
