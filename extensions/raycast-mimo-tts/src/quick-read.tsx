import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { getModelLabel, validateOptions } from "./api/mimo-tts";
import { stopExternalPlayback } from "./utils/audio-player";
import { showTTSFailure } from "./utils/mimo-feedback";
import { AudioPlayer } from "./utils/audio-player";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  getNowPlaying,
  isNowPlayingFresh,
  markError,
  markIdle,
  requestPlaybackStop,
  setNowPlaying,
} from "./utils/mimo-playback-state";
import { playChunksWithLookahead } from "./utils/mimo-pipelined-reading";
import { resolveReadingText } from "./utils/mimo-text-source";
import { chunkText } from "./utils/mimo-text-chunker";
import { buildDefaultOptionsFromPrefs, getActiveQuickReadVoiceId } from "./utils/mimo-voice-preferences";
import { getVoiceById } from "./constants/mimo-voices";
import { createChunkPlaybackCallbacks, finalizeChunkPlayback } from "./utils/mimo-chunk-playback";
import { previewText } from "./utils/mimo-text-preview";

export default async function QuickRead() {
  await runMimoQuickRead();
}

export async function runMimoQuickRead() {
  const state = await getNowPlaying();
  const wasPlaying = stopExternalPlayback();
  const readingStillActive = state
    ? (state.status === "playing" || state.status === "synthesizing") && isNowPlayingFresh(state)
    : false;
  if (wasPlaying || readingStillActive) {
    await requestPlaybackStop();
    await clearNowPlaying();
    await showHUD("Stopped. Run Quick Read again to read new text.");
    return;
  }
  await clearPlaybackStopRequest();

  // Dry-validate config BEFORE any user-visible "loading" state.
  try {
    const { voiceId } = await getActiveQuickReadVoiceId();
    await validateOptions(voiceId);
  } catch (error) {
    await showTTSFailure(error);
    return;
  }

  const { text, source } = await resolveReadingText();
  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text to read",
      message: "Select text on screen or copy something to the clipboard, then try again.",
      primaryAction: {
        title: "Open TTS Studio",
        onAction: () => launchCommand({ name: "tts-studio", type: LaunchType.UserInitiated }),
      },
    });
    return;
  }

  const player = new AudioPlayer();
  const options = await buildDefaultOptionsFromPrefs();
  const voice = getVoiceById(options.voice);
  const voiceName = voice?.name ?? options.voice;
  const modelLabel = getModelLabel(options.model);
  const chunks = chunkText(text);
  const totalChunks = chunks.length;
  const chunkSuffix = totalChunks > 1 ? ` · ${totalChunks} chunks` : "";
  const sourceLabel = source === "clipboard" ? "from clipboard" : "from selection";

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Synthesizing ${sourceLabel}${chunkSuffix}`,
    message: `${voiceName} · ${modelLabel}`,
    primaryAction: {
      title: "Stop Reading",
      shortcut: { modifiers: ["cmd"], key: "." },
      onAction: () => {
        player.stopPlayback();
        stopExternalPlayback();
      },
    },
  });

  await setNowPlaying({
    status: "synthesizing",
    voiceId: options.voice,
    voiceName,
    modelLabel,
    textPreview: previewText(text),
    totalChunks,
    currentChunk: -1,
    startedAt: Date.now(),
    source: source === "clipboard" ? "Clipboard" : "Selection",
  });

  try {
    await playChunksWithLookahead(
      chunks,
      options,
      player,
      createChunkPlaybackCallbacks({
        toast,
        voiceName,
        toastMessage: modelLabel,
        onFirstAudioReady: () => {
          toast.style = Toast.Style.Animated;
        },
      }),
    );

    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      toast.message = `${voiceName} · stopped at current chunk`;
      await markIdle();
      await showHUD("Stopped");
    } else {
      await finalizeChunkPlayback({ player, toast, voiceName, totalChunks });
      await showHUD(`Done · ${voiceName}`);
    }
  } catch (error) {
    await markError(error instanceof Error ? error.message : String(error));
    await showTTSFailure(error);
  } finally {
    player.cleanup();
  }
}
