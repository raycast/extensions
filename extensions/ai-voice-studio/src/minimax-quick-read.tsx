import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { buildOptionsAsync, getModelLabel } from "./api/minimax-tts";
import { streamRealtimeSpeech } from "./api/minimax-tts-realtime";
import { DEFAULT_SAMPLE_RATE, getVoiceById } from "./constants/minimax-voices";
import { AudioPlayer, stopExternalPlayback } from "./utils/audio-player";
import { showTTSFailure } from "./utils/minimax-feedback";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  getNowPlaying,
  hasPlaybackStopRequest,
  isNowPlayingFresh,
  markError,
  markIdle,
  patchNowPlaying,
  requestPlaybackStop,
  setNowPlaying,
} from "./utils/minimax-playback-state";
import { playChunksWithLookahead } from "./utils/minimax-pipelined-reading";
import { resolveReadingText } from "./utils/minimax-text-source";
import { chunkText } from "./utils/minimax-text-chunker";
import { getQuickReadVoiceOverride } from "./utils/minimax-voice-preferences";

export default async function QuickRead() {
  await runMinimaxQuickRead();
}

export async function runMinimaxQuickRead() {
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

  const [voiceOverride, textResult] = await Promise.all([getQuickReadVoiceOverride(), resolveReadingText()]);
  const { text, source } = textResult;

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text to read",
      message: "Select text on screen or copy something to the clipboard, then try again.",
      primaryAction: {
        title: "Open MiniMax Voice Picker",
        onAction: () => launchCommand({ name: "minimax-read-with-voice", type: LaunchType.UserInitiated }),
      },
    });
    return;
  }

  let options;
  try {
    options = await buildOptionsAsync(voiceOverride || undefined);
  } catch (error) {
    await showTTSFailure(error);
    return;
  }

  const voice = getVoiceById(options.voice);
  const voiceName = voice?.name ?? options.voice;
  const modelLabel = getModelLabel(options.model);
  const sourceLabel = source === "clipboard" ? "from clipboard" : "from selection";

  const player = new AudioPlayer();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Connecting ${sourceLabel}`,
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
    totalChunks: 1,
    currentChunk: -1,
    startedAt: Date.now(),
    source: source === "clipboard" ? "Clipboard" : "Selection",
  });

  try {
    await runRealtimePath({ text, options, player, toast, voiceName, modelLabel });

    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      toast.message = `${voiceName} · stopped`;
      await markIdle();
      await showHUD("Stopped");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Playback complete";
      toast.message = `${voiceName} · ${modelLabel}`;
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

interface PlaybackContext {
  text: string;
  options: Awaited<ReturnType<typeof buildOptionsAsync>>;
  player: AudioPlayer;
  toast: Toast;
  voiceName: string;
  modelLabel: string;
}

async function runRealtimePath(ctx: PlaybackContext): Promise<void> {
  const { text, options, player, toast, voiceName, modelLabel } = ctx;
  let firstAudioFired = false;
  player.startPcmStream({
    sampleRate: options.sampleRate || DEFAULT_SAMPLE_RATE,
    playbackRate: options.playbackRate,
    firstChunkMs: 120,
    chunkMs: 500,
  });

  // Realtime stream does not use the chunk-playback engine, so poll for
  // external stop requests here.
  const stopPoll = setInterval(() => {
    if (player.isStopped()) return;
    hasPlaybackStopRequest()
      .then((stop) => {
        if (stop) player.stopPlayback();
      })
      .catch(() => undefined);
  }, 100);
  stopPoll.unref?.();

  try {
    await streamRealtimeSpeech(
      text,
      options,
      {
        onFirstAudio: async () => {
          firstAudioFired = true;
          toast.title = `Playing · ${voiceName}`;
          toast.message = modelLabel;
          await patchNowPlaying({ status: "playing", currentChunk: 0 });
        },
        onPcmChunk: (pcm) => {
          if (player.isStopped()) return;
          player.pushPcm(pcm);
        },
      },
      player.signal,
    );
    if (!player.isStopped()) {
      await player.finishPcmStream();
    }
  } catch (wsError) {
    if (firstAudioFired || player.isStopped()) {
      throw wsError;
    }
    // Silent fallback: realtime path failed before any audio reached the user
    // (WS blocked, sandbox restrictions, early server error). Use the chunked
    // HTTP path so the user still hears something.
    console.warn("MiniMax realtime unavailable, falling back to HTTP:", wsError);
    toast.title = "Synthesizing (HTTP fallback)";
    toast.message = `${voiceName} · ${modelLabel}`;
    await runHttpChunkedPath(ctx);
  } finally {
    clearInterval(stopPoll);
  }
}

async function runHttpChunkedPath({
  text,
  options,
  player,
  toast,
  voiceName,
  modelLabel,
}: PlaybackContext): Promise<void> {
  const chunks = chunkText(text);
  const totalChunks = chunks.length;
  toast.title = totalChunks > 1 ? `Synthesizing 1/${totalChunks}` : "Synthesizing";
  await patchNowPlaying({ totalChunks });

  await playChunksWithLookahead(chunks, options, player, {
    onChunkReady: async (index, total) => {
      toast.title = total > 1 ? `Playing ${index + 1}/${total} · ${voiceName}` : `Playing · ${voiceName}`;
      toast.message = modelLabel;
      await patchNowPlaying({ status: "playing", currentChunk: index });
    },
    onFirstAudioReady: async () => {
      toast.style = Toast.Style.Animated;
    },
  });
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}
