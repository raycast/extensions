import { LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { AudioPlayer, stopExternalPlayback } from "./audio-player";
import type { NowPlayingState } from "./shared-playback-state";

interface QuickReadOptions<Model extends string> {
  voice: string;
  model: Model;
  format: string;
  playbackRate: number;
}

interface VoiceSummary {
  name: string;
}

interface TextResult {
  text: string;
  source: "clipboard" | "selection" | string;
}

interface ChunkPlaybackCallbacks {
  onChunkReady: (index: number, total: number) => Promise<void>;
  onFirstAudioReady: () => Promise<void>;
}

interface ChunkedQuickReadConfig<Model extends string, Options extends QuickReadOptions<Model>> {
  buildDefaultOptions: () => Promise<Options>;
  chunkText: (text: string) => string[];
  clearNowPlaying: () => Promise<void>;
  clearPlaybackStopRequest: () => Promise<void>;
  getActiveQuickReadVoiceId: () => Promise<{ voiceId: string }>;
  getModelLabel: (model: Model) => string;
  getNowPlaying: () => Promise<NowPlayingState | null>;
  getVoiceById: (voiceId: string) => VoiceSummary | undefined;
  isNowPlayingFresh: (state: NowPlayingState) => boolean;
  noTextActionCommand: string;
  noTextActionTitle: string;
  patchNowPlaying: (patch: Partial<NowPlayingState>) => Promise<NowPlayingState | null>;
  playChunksWithLookahead: (
    chunks: string[],
    options: Options,
    player: AudioPlayer,
    callbacks: ChunkPlaybackCallbacks,
  ) => Promise<void>;
  requestPlaybackStop: () => Promise<void>;
  resolveReadingText: () => Promise<TextResult>;
  setNowPlaying: (state: NowPlayingState) => Promise<void>;
  showTTSFailure: (error: unknown, title?: string) => Promise<void>;
  markError: (message: string) => Promise<void>;
  markIdle: () => Promise<void>;
  validateOptions: (voiceId: string) => Promise<unknown>;
}

export async function runChunkedQuickRead<Model extends string, Options extends QuickReadOptions<Model>>(
  config: ChunkedQuickReadConfig<Model, Options>,
) {
  const state = await config.getNowPlaying();
  const wasPlaying = stopExternalPlayback();
  const readingStillActive = state
    ? (state.status === "playing" || state.status === "synthesizing") && config.isNowPlayingFresh(state)
    : false;
  if (wasPlaying || readingStillActive) {
    await config.requestPlaybackStop();
    await config.clearNowPlaying();
    await showHUD("Stopped. Run Quick Read again to read new text.");
    return;
  }
  await config.clearPlaybackStopRequest();

  try {
    const { voiceId } = await config.getActiveQuickReadVoiceId();
    await config.validateOptions(voiceId);
  } catch (error) {
    await config.showTTSFailure(error);
    return;
  }

  const { text, source } = await config.resolveReadingText();
  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text to read",
      message: "Select text on screen or copy something to the clipboard, then try again.",
      primaryAction: {
        title: config.noTextActionTitle,
        onAction: () => launchCommand({ name: config.noTextActionCommand, type: LaunchType.UserInitiated }),
      },
    });
    return;
  }

  const player = new AudioPlayer();
  const options = await config.buildDefaultOptions();
  const voice = config.getVoiceById(options.voice);
  const voiceName = voice?.name ?? options.voice;
  const modelLabel = config.getModelLabel(options.model);
  const chunks = config.chunkText(text);
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

  await config.setNowPlaying({
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
    await config.playChunksWithLookahead(chunks, options, player, {
      onChunkReady: async (index, total) => {
        toast.title = total > 1 ? `Playing ${index + 1}/${total} · ${voiceName}` : `Playing · ${voiceName}`;
        toast.message = modelLabel;
        await config.patchNowPlaying({ status: "playing", currentChunk: index });
      },
      onFirstAudioReady: async () => {
        toast.style = Toast.Style.Animated;
      },
    });

    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      toast.message = `${voiceName} · stopped at current chunk`;
      await config.markIdle();
      await showHUD("Stopped");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Playback complete";
      toast.message = `${voiceName} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
      await config.markIdle();
      await showHUD(`Done · ${voiceName}`);
    }
  } catch (error) {
    await config.markError(error instanceof Error ? error.message : String(error));
    await config.showTTSFailure(error);
  } finally {
    player.cleanup();
  }
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}
