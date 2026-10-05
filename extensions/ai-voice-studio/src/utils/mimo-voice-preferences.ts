import { buildOptionsAsync, buildOptionsFromPrefs } from "../api/mimo-tts";
import { getVoiceById } from "../constants/mimo-voices";
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
  storageKey: "mimo-quick-read-voice-override",
});
