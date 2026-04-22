import { LocalStorage } from "@raycast/api";
import { buildOptionsFromPrefs } from "../api/mimo-tts";
import type { TTSOptions } from "../api/types";
import { getVoiceById } from "../constants/voices";

const QUICK_READ_VOICE_KEY = "quick-read-voice-override";

export async function buildDefaultOptionsFromPrefs(): Promise<TTSOptions> {
  const voiceOverride = await getQuickReadVoiceOverride();
  return buildOptionsFromPrefs(voiceOverride || undefined);
}

export async function getActiveQuickReadVoiceId(): Promise<{ voiceId: string; isOverride: boolean }> {
  const voiceOverride = await getQuickReadVoiceOverride();
  if (voiceOverride && getVoiceById(voiceOverride)) {
    return { voiceId: voiceOverride, isOverride: true };
  }
  if (voiceOverride) {
    await clearQuickReadVoiceOverride();
  }

  return { voiceId: buildOptionsFromPrefs().voice, isOverride: false };
}

export async function getQuickReadVoiceOverride(): Promise<string | null> {
  const voiceId = await LocalStorage.getItem<string>(QUICK_READ_VOICE_KEY);
  return voiceId?.trim() || null;
}

export async function setQuickReadVoiceOverride(voiceId: string): Promise<void> {
  await LocalStorage.setItem(QUICK_READ_VOICE_KEY, voiceId);
}

export async function clearQuickReadVoiceOverride(): Promise<void> {
  await LocalStorage.removeItem(QUICK_READ_VOICE_KEY);
}
