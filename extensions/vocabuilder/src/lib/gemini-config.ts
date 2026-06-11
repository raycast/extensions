/**
 * Constants describing our integration with Google's Generative Language API:
 * the endpoint, the retry policy, and the audio output contract for TTS.
 * Shared by `gemini.ts` (translation) and `tts.ts` (audio).
 */
export const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const MAX_RETRY_ATTEMPTS = 3;
export const BASE_RETRY_DELAY_MS = 400;

// Gemini TTS audio contract — these describe what the API returns; changing
// them does not change Gemini's output, it only breaks our WAV wrapper.
export const TTS_DEFAULT_VOICE = "Kore";
export const TTS_SAMPLE_RATE = 24000;
export const TTS_NUM_CHANNELS = 1;
export const TTS_BITS_PER_SAMPLE = 16;
