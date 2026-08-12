import { defaultToastFor } from "./errorToast";
import { isGeminiError, isTransient } from "./geminiError";
import { hasMacOsFallback } from "./tts";

export type TtsErrorRouting = { title: string; message: string; fallback: boolean };

/**
 * Route a TTS failure to a toast spec + fallback decision.
 *
 * Key invariant: when `fallback` is true, the message must NOT be a "try again"
 * prompt from defaultToastFor — the caller surfaces it in a "Using system voice"
 * success toast, where retry copy would contradict the title. All transient
 * kinds therefore swap to the neutral "Using system voice for now." copy.
 */
export function routeTtsError(err: unknown, languageCode: string): TtsErrorRouting {
  if (isGeminiError(err)) {
    const base = defaultToastFor(err.cause);
    if (isTransient(err)) {
      return { ...base, message: "Using system voice for now.", fallback: true };
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
