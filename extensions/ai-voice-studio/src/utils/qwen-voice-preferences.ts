import { buildOptionsAsync, buildOptionsFromPrefs } from "../api/qwen-tts";
import type { QwenTTSModel } from "../api/qwen-tts-types";
import { getVoiceById } from "../constants/qwen-tts-voices";
import { createQuickReadVoicePreferences } from "./quick-read-voice-preferences";

export const {
  buildDefaultOptionsFromPrefs,
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  getQuickReadVoiceOverride,
  setQuickReadVoiceOverride,
} = createQuickReadVoicePreferences({
  buildOptionsAsync,
  buildOptionsFromPrefs,
  storageKey: "qwen-quick-read-voice-override",
});

/**
 * Drop the Quick Read voice override when it is not available on the given model, so switching
 * the model (e.g. from a flash-only dialect voice back to qwen-tts-latest) cannot leave Quick
 * Read pointing at a voice the model rejects. A valid override is kept untouched.
 */
export async function dropQuickReadVoiceOverrideIfInvalid(model: QwenTTSModel): Promise<void> {
  const override = await getQuickReadVoiceOverride();
  if (!override) return;
  const voice = getVoiceById(override);
  if (!voice || !voice.models.includes(model)) {
    await clearQuickReadVoiceOverride();
  }
}
