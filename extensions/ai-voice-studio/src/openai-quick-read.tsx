import { getModelLabel, validateOptions } from "./api/openai-tts";
import { getVoiceById } from "./constants/openai-voices";
import { chunkText } from "./utils/openai-text-chunker";
import { showTTSFailure } from "./utils/openai-feedback";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  getNowPlaying,
  isNowPlayingFresh,
  markError,
  markIdle,
  patchNowPlaying,
  requestPlaybackStop,
  setNowPlaying,
} from "./utils/openai-playback-state";
import { playChunksWithLookahead } from "./utils/openai-pipelined-reading";
import { resolveReadingText } from "./utils/openai-text-source";
import { buildDefaultOptionsFromPrefs, getActiveQuickReadVoiceId } from "./utils/openai-voice-preferences";
import { runChunkedQuickRead } from "./utils/shared-quick-read";

export default async function QuickRead() {
  await runOpenAIQuickRead();
}

export async function runOpenAIQuickRead() {
  await runChunkedQuickRead({
    buildDefaultOptions: buildDefaultOptionsFromPrefs,
    chunkText,
    clearNowPlaying,
    clearPlaybackStopRequest,
    getActiveQuickReadVoiceId,
    getModelLabel,
    getNowPlaying,
    getVoiceById,
    isNowPlayingFresh,
    markError,
    markIdle,
    noTextActionCommand: "openai-read-with-voice",
    noTextActionTitle: "Open OpenAI Voice Picker",
    patchNowPlaying,
    playChunksWithLookahead,
    requestPlaybackStop,
    resolveReadingText,
    setNowPlaying,
    showTTSFailure,
    validateOptions,
  });
}
