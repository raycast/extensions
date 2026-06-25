import { LocalStorage } from "@raycast/api";
import { buildOptionsFromPrefs } from "../api/gemini-tts";
import type { TTSOptions } from "../api/types";
import { GEMINI_VOICES } from "../constants/voices";

const QUICK_READ_VOICE_KEY = "quick-read-voice-override";
const GEMINI_VOICE_IDS = new Set(GEMINI_VOICES.map((voice) => voice.id));

export async function buildDefaultOptionsFromPrefs(): Promise<TTSOptions> {
  const voiceOverride = await getQuickReadVoiceOverride();
  return buildOptionsFromPrefs(voiceOverride || undefined);
}

export async function getActiveQuickReadVoiceId(): Promise<{ voiceId: string; isOverride: boolean }> {
  const voiceOverride = await getQuickReadVoiceOverride();
  if (voiceOverride) {
    return { voiceId: voiceOverride, isOverride: true };
  }

  return { voiceId: buildOptionsFromPrefs().voiceId, isOverride: false };
}

export async function getQuickReadVoiceOverride(): Promise<string | null> {
  const voiceId = await LocalStorage.getItem<string>(QUICK_READ_VOICE_KEY);
  const trimmed = voiceId?.trim();
  if (!trimmed) return null;
  if (!GEMINI_VOICE_IDS.has(trimmed)) {
    await clearQuickReadVoiceOverride();
    return null;
  }
  return trimmed;
}

export async function setQuickReadVoiceOverride(voiceId: string): Promise<void> {
  await LocalStorage.setItem(QUICK_READ_VOICE_KEY, voiceId);
}

export async function clearQuickReadVoiceOverride(): Promise<void> {
  await LocalStorage.removeItem(QUICK_READ_VOICE_KEY);
}
