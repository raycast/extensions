import { synthesizeSpeech } from "../api/openai-tts";
import { hasPlaybackStopRequest } from "./openai-playback-state";
import { createPipelinedPlayback } from "./pipelined-reading";

export { ChunkSynthesisError } from "./pipelined-reading";

export const playChunksWithLookahead = createPipelinedPlayback({
  synthesize: synthesizeSpeech,
  hasStopRequest: hasPlaybackStopRequest,
});
