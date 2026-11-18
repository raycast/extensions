import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { buildOptionsAsync, getModelLabel } from "./api/qwen-tts";
import { streamRealtimeSpeech, toRealtimeModel } from "./api/qwen-tts-realtime";
import { getVoiceById } from "./constants/qwen-tts-voices";
import { AudioPlayer, stopExternalPlayback } from "./utils/audio-player";
import { showTTSFailure } from "./utils/qwen-feedback";
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
} from "./utils/qwen-playback-state";
import { playChunksWithLookahead } from "./utils/qwen-pipelined-reading";
import { resolveReadingText } from "./utils/qwen-text-source";
import { chunkText } from "./utils/qwen-text-chunker";
import { getQuickReadVoiceOverride } from "./utils/qwen-voice-preferences";

export default async function QuickRead() {
  await runQwenQuickRead();
}

export async function runQwenQuickRead() {
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

  // Read selected text and the user's voice override in parallel — selection
  // grab can take 100-300ms on macOS, so doing it alongside LocalStorage reads
  // avoids serial wait. Options build still depends on voice override, so it
  // happens after these two settle.
  const [voiceOverride, textResult] = await Promise.all([getQuickReadVoiceOverride(), resolveReadingText()]);
  const { text, source } = textResult;

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text to read",
      message: "Select text on screen or copy something to the clipboard, then try again.",
      primaryAction: {
        title: "Open Qwen-TTS Voice Picker",
        onAction: () => launchCommand({ name: "qwen-read-with-voice", type: LaunchType.UserInitiated }),
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
  const useRealtime = toRealtimeModel(options.model) !== null;

  const player = new AudioPlayer();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: useRealtime ? `Connecting ${sourceLabel}` : `Synthesizing ${sourceLabel}`,
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
    totalChunks: useRealtime ? 1 : 0,
    currentChunk: -1,
    startedAt: Date.now(),
    source: source === "clipboard" ? "Clipboard" : "Selection",
  });

  try {
    if (useRealtime) {
      await runRealtimePath({ text, options, player, toast, voiceName, modelLabel });
    } else {
      await runHttpChunkedPath({ text, options, player, toast, voiceName, modelLabel });
    }

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
    // The realtime path surfaces a user-initiated stop as a rejection of the
    // WebSocket session (signal aborts -> TTSApiError(-7)) rather than a
    // resolved kind:"stopped" outcome, so reaching here with the player in
    // stopped state means the user intentionally cancelled. Treat that the
    // same as the success-path stopped branch instead of an error.
    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      toast.message = `${voiceName} · stopped`;
      await markIdle();
      await showHUD("Stopped");
    } else {
      await markError(error instanceof Error ? error.message : String(error));
      await showTTSFailure(error);
    }
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
    sampleRate: 24000,
    playbackRate: options.playbackRate,
    firstChunkMs: 120,
    chunkMs: 500,
  });

  // Poll for external stop requests once playback is engaged. Realtime stream
  // does not use the chunk-playback engine, so we need our own stop bridge.
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
    // Server has streamed all audio; drain remaining queued chunks.
    if (!player.isStopped()) {
      await player.finishPcmStream();
    }
  } catch (wsError) {
    // Re-throw once the user has heard anything (avoid restarting mid-sentence)
    // or when the user has explicitly stopped playback.
    if (firstAudioFired || player.isStopped()) {
      throw wsError;
    }
    // Silent fallback: the realtime WS path failed before any audio reached
    // the user. Typical causes: WSS blocked by a network/firewall/proxy, TLS
    // failure, sandbox restrictions, or an early server error. Fall through
    // to the HTTP chunked path so the user still hears something — just at
    // the old (slower) first-audio latency.
    console.warn("Qwen-TTS realtime unavailable, falling back to HTTP:", wsError);
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
