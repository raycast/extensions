import { synthesizeSpeech } from "../api/mimo-tts";
import { hasPlaybackStopRequest } from "./mimo-playback-state";
import { createPipelinedPlayback } from "./pipelined-reading";

export { ChunkSynthesisError } from "./pipelined-reading";

export const playChunksWithLookahead = createPipelinedPlayback({
  synthesize: synthesizeSpeech,
  hasStopRequest: hasPlaybackStopRequest,
});
