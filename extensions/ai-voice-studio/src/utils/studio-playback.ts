import { Toast, showToast } from "@raycast/api";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { AudioPlayer } from "./audio-player";
import type { NowPlayingState } from "./shared-playback-state";

interface StudioPlaybackOptions<Model extends string> {
  model: Model;
  playbackRate: number;
}

interface ChunkPlaybackCallbacks {
  onChunkReady: (index: number, total: number) => Promise<void>;
  onFirstAudioReady: () => Promise<void>;
}

interface StudioPlaybackConfig<Model extends string, Options extends StudioPlaybackOptions<Model>> {
  buildOptions: (rate: number) => Promise<Options>;
  chunkText: (text: string) => string[];
  clearPlaybackStopRequest: () => Promise<void>;
  formatSpeed: (rate: number) => string;
  getModelLabel: (model: Model) => string;
  getVoiceName: (voiceId: string) => string;
  markError: (message: string) => Promise<void>;
  markIdle: () => Promise<void>;
  parseRateString: (value: string | undefined | null) => number;
  patchNowPlaying: (patch: Partial<NowPlayingState>) => Promise<NowPlayingState | null>;
  playChunksWithLookahead: (
    chunks: string[],
    options: Options,
    player: AudioPlayer,
    callbacks: ChunkPlaybackCallbacks,
  ) => Promise<void>;
  playerRef: MutableRefObject<AudioPlayer>;
  rateValue: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setNowPlaying: (state: NowPlayingState) => Promise<void>;
  setSpeedOverride: (rate: number) => Promise<number>;
  showTTSFailure: (error: unknown, title?: string) => Promise<void>;
  source: string;
  text: string;
  voiceId: string;
}

export async function runStudioPlayback<Model extends string, Options extends StudioPlaybackOptions<Model>>(
  config: StudioPlaybackConfig<Model, Options>,
) {
  const textToRead = config.text.trim();
  if (!textToRead) {
    await showToast({ style: Toast.Style.Failure, title: "No text to read" });
    return;
  }

  config.playerRef.current.stopPlayback();
  await config.clearPlaybackStopRequest();
  const player = new AudioPlayer();
  config.playerRef.current = player;
  config.setIsLoading(true);
  config.setIsPlaying(true);

  try {
    const voiceName = config.getVoiceName(config.voiceId);
    const rate = config.parseRateString(config.rateValue);
    await config.setSpeedOverride(rate);

    const options = await config.buildOptions(rate);
    const modelLabel = config.getModelLabel(options.model);
    const chunks = config.chunkText(textToRead);
    const totalChunks = chunks.length;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Synthesizing${totalChunks > 1 ? ` · ${totalChunks} chunks` : ""}`,
      message: `${voiceName} · ${modelLabel} · ${config.formatSpeed(rate)}`,
    });

    await config.setNowPlaying({
      status: "synthesizing",
      voiceId: config.voiceId,
      voiceName,
      modelLabel,
      textPreview: previewText(textToRead),
      totalChunks,
      currentChunk: -1,
      startedAt: Date.now(),
      source: config.source,
    });

    await config.playChunksWithLookahead(chunks, options, player, {
      onChunkReady: async (index, total) => {
        toast.title = total > 1 ? `Playing ${index + 1}/${total} · ${voiceName}` : `Playing · ${voiceName}`;
        toast.message = `${modelLabel} · ${config.formatSpeed(rate)}`;
        await config.patchNowPlaying({ status: "playing", currentChunk: index });
      },
      onFirstAudioReady: async () => {
        config.setIsLoading(false);
      },
    });

    if (player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = "Stopped";
      await config.markIdle();
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Playback complete";
      toast.message = `${voiceName} · ${totalChunks > 1 ? `${totalChunks} chunks` : "1 chunk"}`;
      await config.markIdle();
    }
  } catch (error) {
    await config.markError(error instanceof Error ? error.message : String(error));
    await config.showTTSFailure(error);
  } finally {
    config.setIsLoading(false);
    config.setIsPlaying(false);
  }
}

function previewText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}
