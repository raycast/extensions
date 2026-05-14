import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { clearExternalStopRequest, requestExternalStop, stopExternalPlayback } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import { prepareReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { buildDefaultOptionsFromPrefs } from "./utils/voice-preferences";
import { presentCommandError, showResumeSuggestion } from "./utils/errors";
import { clearPlaybackState, readPlaybackState } from "./utils/playback-state";
import { getDefaultProvider } from "./utils/provider";

export default async function QuickRead() {
  const provider = await getDefaultProvider();
  if (provider === "openai") {
    await launchCommand({ name: "openai-quick-read", type: LaunchType.UserInitiated });
    return;
  }
  if (provider === "mimo") {
    await launchCommand({ name: "mimo-quick-read", type: LaunchType.UserInitiated });
    return;
  }

  const liveState = await readPlaybackState();
  const hasActiveMiniMaxReading = liveState?.phase === "synthesizing" || liveState?.phase === "playing";

  if (hasActiveMiniMaxReading) {
    requestExternalStop();
    stopExternalPlayback();
    await clearPlaybackState();
    await showHUD("Stopped");
    return;
  }

  // Toggle: if our afplay is already running, stop it and return.
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await clearPlaybackState();
    await showHUD("Stopped");
    return;
  }

  clearExternalStopRequest();

  try {
    const readableText = await getReadableText();
    if (!readableText) {
      const lastSessionAvailable = liveState && (liveState.phase === "stopped" || liveState.phase === "playing");

      if (lastSessionAvailable) {
        await showResumeSuggestion(
          "Nothing to read",
          "Select text in the foreground app or copy it to the clipboard, then trigger Quick Read again.",
        );
      } else {
        await showResumeSuggestion(
          "Nothing to read",
          "Select text in the foreground app or copy it to the clipboard. You can also resume your last reading.",
        );
      }
      return;
    }

    const options = await buildDefaultOptionsFromPrefs();
    const { session, isResuming } = await prepareReadingSession(readableText.text, readableText.source, options);
    await playReadingSession(session, isResuming);
  } catch (error) {
    await presentCommandError(error, "Failed to read selection");
  }
}
