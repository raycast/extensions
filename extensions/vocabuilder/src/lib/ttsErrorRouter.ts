import { defaultToastFor } from "./errorToast";
import { isProviderError, isTransient } from "./providerError";
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
  if (isProviderError(err)) {
    const base = defaultToastFor(err.cause);
    if (isTransient(err)) {
      return { ...base, message: "Using system voice for now.", fallback: true };
    }
    return { ...base, fallback: false };
  }
  // Anything reaching here is an fs/exec failure whose message carries absolute
  // paths and command text. tts.ts already logs the original; the toast gets
  // fixed copy. See AGENTS.md → Security Guardrails.
  const fallback = hasMacOsFallback(languageCode);
  return {
    title: "Pronunciation failed",
    message: fallback ? "Using system voice for now." : "Could not play the pronunciation. Please try again.",
    fallback,
  };
}
