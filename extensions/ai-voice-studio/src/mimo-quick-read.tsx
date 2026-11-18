import { getModelLabel, validateOptions } from "./api/mimo-tts";
import { getVoiceById } from "./constants/mimo-voices";
import { chunkText } from "./utils/mimo-text-chunker";
import { showTTSFailure } from "./utils/mimo-feedback";
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
} from "./utils/mimo-playback-state";
import { playChunksWithLookahead } from "./utils/mimo-pipelined-reading";
import { resolveReadingText } from "./utils/mimo-text-source";
import { buildDefaultOptionsFromPrefs, getActiveQuickReadVoiceId } from "./utils/mimo-voice-preferences";
import { runChunkedQuickRead } from "./utils/shared-quick-read";

export default async function QuickRead() {
  await runMimoQuickRead();
}

export async function runMimoQuickRead() {
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
    noTextActionCommand: "tts-studio",
    noTextActionTitle: "Open TTS Studio",
    patchNowPlaying,
    playChunksWithLookahead,
    requestPlaybackStop,
    resolveReadingText,
    setNowPlaying,
    showTTSFailure,
    validateOptions,
  });
}
