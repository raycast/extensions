import { showProviderTTSFailure } from "./tts-feedback";

export async function showTTSFailure(error: unknown, fallbackTitle = "Qwen-TTS Error"): Promise<void> {
  await showProviderTTSFailure(error, fallbackTitle);
}
