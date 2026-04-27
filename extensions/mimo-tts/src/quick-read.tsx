import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { getModelLabel, validateOptions } from "./api/mimo-tts";
import { stopExternalPlayback } from "./utils/audio-player";
import { showTTSFailure } from "./utils/feedback";
import { AudioPlayer } from "./utils/audio-player";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  getNowPlaying,
  markError,
  markIdle,
  patchNowPlaying,
  requestPlaybackStop,
  setNowPlaying,
} from "./utils/playback-state";
import { playChunksWithLookahead } from "./utils/pipelined-reading";
import { resolveReadingText } from "./utils/text-source";
import { chunkText } from "./utils/text-chunker";
import { buildDefaultOptionsFromPrefs, getActiveQuickReadVoiceId } from "./utils/voice-preferences";
import { getVoiceById } from "./constants/voices";

export default async function QuickRead() {
  const state = await getNowPlaying();
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying || state?.status === "playing" || state?.status === "synthesizing") {
    await requestPlaybackStop();
    await clearNowPlaying();
    await showHUD("Stopped — run Quick Read again to resume reading new text");
    return;
  }
  await clearPlaybackStopRequest();

  // Dry-validate config BEFORE any user-visible "loading" state.
  try {
    const { voiceId } = await getActiveQuickReadVoiceId();
    validateOptions(voiceId);
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
        onAction: () => launchCommand({ name: "read-with-controls", type: LaunchType.UserInitiated }),
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
    await playChunksWithLookahead(chunks, options, player, {
      onChunkReady: async (index, total) => {
        const label = total > 1 ? `Playing ${index + 1}/${total} · ${voiceName}` : `Playing · ${voiceName}`;
        toast.title = label;
        toast.message = modelLabel;
        await patchNowPlaying({ status: "playing", currentChunk: index });
      },
      onFirstAudioReady: async () => {
        toast.style = Toast.Style.Animated;
      },
    });

    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      toast.message = `${voiceName} · paused at ${player.isStopped() ? "current chunk" : ""}`;
      await markIdle();
      await showHUD("Stopped");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Playback complete";
      toast.message = `${voiceName} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
      await markIdle();
      await showHUD(`Done · ${voiceName}`);
    }
  } catch (error) {
    await markError(error instanceof Error ? error.message : String(error));
    await showTTSFailure(error);
  } finally {
    player.cleanup();
  }
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}
