import { synthesizeSpeech } from "../api/volcengine-tts";
import type { TTSOptions } from "../api/types";
import { AudioPlayer } from "./audio-player";

type SynthesisResult = { audio: string } | { error: unknown };

interface PipelinedPlaybackCallbacks {
  onChunkReady?: (index: number, total: number) => Promise<void> | void;
  onFirstAudioReady?: () => Promise<void> | void;
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
    if ("error" in result) {
      if (player.isStopped()) break;
      throw result.error;
    }

    if (player.isStopped()) break;

    currentJob = index + 1 < chunks.length ? startSynthesisJob(chunks[index + 1], options, player.signal) : null;

    await callbacks.onChunkReady?.(index, chunks.length);
    if (index === 0) {
      await callbacks.onFirstAudioReady?.();
    }

    await player.playAudio(result.audio);
    if (player.isStopped()) break;
  }
}

function startSynthesisJob(text: string, options: TTSOptions, signal: AbortSignal): Promise<SynthesisResult> {
  return synthesizeSpeech(text, options, signal).then(
    (audio) => ({ audio }),
    (error) => ({ error }),
  );
}
