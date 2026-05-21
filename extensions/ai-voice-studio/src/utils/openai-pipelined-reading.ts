import { synthesizeSpeech } from "../api/openai-tts";
import type { TTSOptions } from "../api/openai-types";
import type { AudioPlayer } from "./audio-player";
import { hasPlaybackStopRequest } from "./openai-playback-state";
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
