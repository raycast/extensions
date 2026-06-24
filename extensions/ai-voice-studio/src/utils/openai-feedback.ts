import { showProviderTTSFailure } from "./tts-feedback";

export async function showTTSFailure(error: unknown, fallbackTitle = "OpenAI TTS Error"): Promise<void> {
  await showProviderTTSFailure(error, fallbackTitle);
}
