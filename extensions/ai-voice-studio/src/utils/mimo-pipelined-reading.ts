import { synthesizeSpeech } from "../api/mimo-tts";
import type { TTSOptions } from "../api/mimo-types";
import { AudioPlayer } from "./audio-player";
import { hasPlaybackStopRequest } from "./mimo-playback-state";

type SynthesisResult = { audio: string } | { error: unknown };

interface PipelinedPlaybackCallbacks {
  onChunkReady?: (index: number, total: number) => Promise<void> | void;
  onFirstAudioReady?: () => Promise<void> | void;
}

class ChunkSynthesisError extends Error {
  readonly index: number;
  readonly total: number;
  readonly cause: unknown;

  constructor(index: number, total: number, cause: unknown) {
    const base = cause instanceof Error ? cause.message : String(cause);
    super(total > 1 ? `Chunk ${index + 1}/${total} failed: ${base}` : base);
    this.name = "ChunkSynthesisError";
    this.index = index;
    this.total = total;
    this.cause = cause;
  }
}

/**
 * Play chunks sequentially while synthesizing the next chunk during current playback.
 */
export async function playChunksWithLookahead(
  chunks: string[],
  options: TTSOptions,
  player: AudioPlayer,
  callbacks: PipelinedPlaybackCallbacks = {},
): Promise<void> {
  if (chunks.length === 0) return;

  let currentJob: Promise<SynthesisResult> | null = startSynthesisJob(chunks[0], options, player.signal);

  for (let index = 0; index < chunks.length && currentJob; index++) {
    const result = await currentJob;
    if (await shouldStop(player)) break;

    if ("error" in result) {
      if (player.isStopped()) break;
      throw new ChunkSynthesisError(index, chunks.length, result.error);
    }

    if (await shouldStop(player)) break;

    currentJob = index + 1 < chunks.length ? startSynthesisJob(chunks[index + 1], options, player.signal) : null;

    await callbacks.onChunkReady?.(index, chunks.length);
    if (index === 0) {
      await callbacks.onFirstAudioReady?.();
    }

    await player.playAudio(result.audio, options.format, options.playbackRate);
    if (await shouldStop(player)) break;
  }
}

async function shouldStop(player: AudioPlayer): Promise<boolean> {
  if (player.isStopped()) return true;
  if (await hasPlaybackStopRequest()) {
    player.stopPlayback();
    return true;
  }
  return false;
}

function startSynthesisJob(text: string, options: TTSOptions, signal: AbortSignal): Promise<SynthesisResult> {
  return synthesizeSpeech(text, options, signal).then(
    (audio) => ({ audio }),
    (error) => ({ error }),
  );
}
