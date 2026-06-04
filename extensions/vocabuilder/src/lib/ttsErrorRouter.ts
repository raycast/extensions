import { defaultToastFor } from "./errorToast";
import { isGeminiError, isTransient } from "./geminiError";
import { hasMacOsFallback } from "./tts";

export type TtsErrorRouting = { title: string; message: string; fallback: boolean };

/** Success-toast body when macOS `say` recovers after a transient Gemini TTS failure. */
export const SYSTEM_VOICE_FALLBACK_MESSAGE = "Using system voice for now.";

/**
 * Route a TTS failure to a toast spec + fallback decision.
 *
 * `message` is always the failure copy from `defaultToastFor` (or the raw error).
 * On successful fallback, `pronounceFlow` surfaces `SYSTEM_VOICE_FALLBACK_MESSAGE`
 * instead — retry wording must not leak into a success toast, and must remain
 * available when both Gemini and `say` fail.
 */
export function routeTtsError(err: unknown, languageCode: string): TtsErrorRouting {
  if (isGeminiError(err)) {
    const base = defaultToastFor(err.cause);
    if (isTransient(err)) {
      return { ...base, fallback: true };
    }
    return { ...base, fallback: false };
  }
  const error = err instanceof Error ? err : new Error(String(err));
  return {
    title: "Pronunciation failed",
    message: error.message || "Unknown error.",
    fallback: hasMacOsFallback(languageCode),
  };
}
