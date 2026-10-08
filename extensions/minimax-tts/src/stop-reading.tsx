import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { stopExternalPlayback } from "./utils/audio-player";
import { clearPlaybackState, readPlaybackState } from "./utils/playback-state";
import { getLastReadingSession } from "./utils/reading-session";

export default async function StopReading() {
  const stopped = stopExternalPlayback();

  if (stopped) {
    await clearPlaybackState();
    await showHUD("Playback stopped");
    return;
  }

  // Nothing playing right now — try to surface a useful next action instead
  // of silently flashing "No active playback".
  const [liveState, lastSession] = await Promise.all([readPlaybackState(), getLastReadingSession()]);

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
