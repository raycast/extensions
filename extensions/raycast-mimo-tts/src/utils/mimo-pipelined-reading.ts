import { synthesizeSpeech } from "../api/mimo-tts";
import type { TTSOptions } from "../api/mimo-types";
import type { AudioPlayer } from "./audio-player";
import { hasPlaybackStopRequest } from "./mimo-playback-state";
import { playChunksWithLookahead as runPipeline, type PipelinedPlaybackCallbacks } from "./pipelined-reading";

export { ChunkSynthesisError } from "./pipelined-reading";

export function playChunksWithLookahead(
  chunks: string[],
  options: TTSOptions,
  player: AudioPlayer,
  callbacks: PipelinedPlaybackCallbacks = {},
): Promise<void> {
  return runPipeline(
    chunks,
    options,
    player,
    { synthesize: synthesizeSpeech, hasStopRequest: hasPlaybackStopRequest },
    callbacks,
  );
}
