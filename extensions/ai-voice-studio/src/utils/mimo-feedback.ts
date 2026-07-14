import { showProviderTTSFailure } from "./tts-feedback";

/**
 * Show a consistent failure toast for any TTS error. Configuration errors
 * surface a setup action so the user can act on them.
 * Every error toast also exposes Copy Error Details so users can report issues.
 */
export async function showTTSFailure(error: unknown, fallbackTitle = "MiMo TTS Error"): Promise<void> {
  await showProviderTTSFailure(error, fallbackTitle);
}
