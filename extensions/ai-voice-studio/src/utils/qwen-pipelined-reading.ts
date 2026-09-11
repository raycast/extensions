import { synthesizeSpeech } from "../api/qwen-tts";
import { hasPlaybackStopRequest } from "./qwen-playback-state";
import { createPipelinedPlayback } from "./pipelined-reading";

export { ChunkSynthesisError } from "./pipelined-reading";

export const playChunksWithLookahead = createPipelinedPlayback({
  synthesize: synthesizeSpeech,
  hasStopRequest: hasPlaybackStopRequest,
});
