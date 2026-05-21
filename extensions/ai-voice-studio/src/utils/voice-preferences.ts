import { LocalStorage } from "@raycast/api";
import { buildOptionsFromPrefs, validateOptions } from "../api/minimax-tts";
import type { TTSOptions } from "../api/types";

const QUICK_READ_VOICE_KEY = "quick-read-voice-override";

export async function buildDefaultOptionsFromPrefs(): Promise<TTSOptions> {
  const voiceOverride = await getQuickReadVoiceOverride();
  return buildOptionsFromPrefs(voiceOverride || undefined);
}

/**
 * Like buildDefaultOptionsFromPrefs, but also runs the credential / model
 * pre-flight so callers can fail fast with a guided error before any loading.
 */
export async function validateDefaultOptions(): Promise<TTSOptions> {
  const voiceOverride = await getQuickReadVoiceOverride();
  return validateOptions(voiceOverride || undefined);
}

export async function getActiveQuickReadVoiceId(): Promise<{ voiceId: string; isOverride: boolean }> {
  const voiceOverride = await getQuickReadVoiceOverride();
  if (voiceOverride) {
    return { voiceId: voiceOverride, isOverride: true };
  }

  return { voiceId: (await buildOptionsFromPrefs()).voiceId, isOverride: false };
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
