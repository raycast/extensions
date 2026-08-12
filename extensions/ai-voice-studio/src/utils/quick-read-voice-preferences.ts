import { LocalStorage } from "@raycast/api";

interface QuickReadVoicePreferenceConfig<TOptions extends { voice: string }> {
  buildOptionsAsync: (voiceOverride?: string) => Promise<TOptions>;
  buildOptionsFromPrefs: () => Promise<TOptions>;
  getVoiceById?: (voiceId: string) => unknown;
  storageKey: string;
}

export function createQuickReadVoicePreferences<TOptions extends { voice: string }>(
  config: QuickReadVoicePreferenceConfig<TOptions>,
) {
  async function buildDefaultOptionsFromPrefs(): Promise<TOptions> {
    const voiceOverride = await getQuickReadVoiceOverride();
    return config.buildOptionsAsync(voiceOverride || undefined);
  }

  async function getActiveQuickReadVoiceId(): Promise<{ voiceId: string; isOverride: boolean }> {
    const voiceOverride = await getQuickReadVoiceOverride();
    if (voiceOverride && (!config.getVoiceById || config.getVoiceById(voiceOverride))) {
      return { voiceId: voiceOverride, isOverride: true };
    }
    if (voiceOverride) {
      await clearQuickReadVoiceOverride();
    }

    return { voiceId: (await config.buildOptionsFromPrefs()).voice, isOverride: false };
  }

  async function getQuickReadVoiceOverride(): Promise<string | null> {
    const voiceId = await LocalStorage.getItem<string>(config.storageKey);
    return voiceId?.trim() || null;
  }

  async function setQuickReadVoiceOverride(voiceId: string): Promise<void> {
    await LocalStorage.setItem(config.storageKey, voiceId);
  }

  async function clearQuickReadVoiceOverride(): Promise<void> {
    await LocalStorage.removeItem(config.storageKey);
  }

  return {
    buildDefaultOptionsFromPrefs,
    clearQuickReadVoiceOverride,
    getActiveQuickReadVoiceId,
    getQuickReadVoiceOverride,
    setQuickReadVoiceOverride,
  };
}
