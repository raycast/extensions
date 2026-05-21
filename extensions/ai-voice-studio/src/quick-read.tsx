import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { clearExternalStopRequest, requestExternalStop, stopExternalPlayback } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import { prepareReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { validateDefaultOptions } from "./utils/voice-preferences";
import { presentCommandError, showResumeSuggestion } from "./utils/errors";
import { clearPlaybackState, isPlaybackStateFresh, readPlaybackState } from "./utils/playback-state";
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
  const hasActiveMiniMaxReading =
    (liveState?.phase === "synthesizing" || liveState?.phase === "playing") && isPlaybackStateFresh(liveState);

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
    // Pre-flight: resolve options and run the credential/model check before
    // any loading, so a missing key surfaces a guided error immediately
    // instead of after a silent pause mid-synthesis.
    const options = await validateDefaultOptions();

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

    const { session, isResuming } = await prepareReadingSession(readableText.text, readableText.source, options);

    const sourceLabel = readableText.source === "clipboard" ? "from clipboard" : "from selection";
    const chunkSuffix = session.chunks.length > 1 ? ` · ${session.chunks.length} chunks` : "";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${isResuming ? "Resuming" : "Synthesizing"} ${sourceLabel}${chunkSuffix}`,
      primaryAction: {
        title: "Stop Reading",
        shortcut: { modifiers: ["cmd"], key: "." },
        onAction: () => {
          requestExternalStop();
          stopExternalPlayback();
        },
      },
    });

    await playReadingSession(session, isResuming, {
      suppressHud: true,
      onChunkPhase: ({ phase, chunkIndex, chunkTotal }) => {
        const counter = chunkTotal > 1 ? ` ${chunkIndex + 1}/${chunkTotal}` : "";
        toast.title = phase === "synthesizing" ? `Synthesizing${counter}` : `Playing${counter}`;
      },
    });

    const finalState = await readPlaybackState();
    toast.style = Toast.Style.Success;
    toast.title = finalState?.phase === "stopped" ? "Stopped" : "Playback complete";
  } catch (error) {
    await presentCommandError(error, "Failed to read selection");
  }
}
