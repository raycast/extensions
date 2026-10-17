import { buildOptionsAsync, buildOptionsFromPrefs } from "../api/openai-tts";
import { getVoiceById } from "../constants/openai-voices";
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
  getVoiceById,
  storageKey: "openai-quick-read-voice-override",
});
