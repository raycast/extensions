import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../core/languages";
import { resolvePrimaryAction, type PrimaryAction } from "../core/output";
import { activeProviders, loadProviderSettings } from "../core/provider-settings";
import type { ProviderConfig } from "../core/providers";
import { languagePair, type TranslationTarget } from "../core/target";
import { DEFAULT_TONE, resolveTone, type ToneId } from "../core/tones";
import { localStore } from "./storage";

interface RawPreferences {
  readonly mainLanguage?: string;
  readonly secondLanguage?: string;
  readonly defaultTone?: string;
  readonly primaryAction?: string;
}

export interface Settings {
  readonly providers: readonly ProviderConfig[];
  readonly defaultTone: ToneId;
  readonly primaryAction: PrimaryAction;
  readonly target: TranslationTarget;
}

const SECOND_LANGUAGE = resolveLanguage("id", DEFAULT_LANGUAGE);

export async function loadSettings(): Promise<Settings> {
  const preferences = getPreferenceValues<RawPreferences>();
  const managed = await loadProviderSettings(localStore);
  return {
    providers: activeProviders(managed),
    defaultTone: resolveTone(preferences.defaultTone, DEFAULT_TONE),
    primaryAction: resolvePrimaryAction(preferences.primaryAction),
    target: languagePair(
      resolveLanguage(preferences.mainLanguage, DEFAULT_LANGUAGE),
      resolveLanguage(preferences.secondLanguage, SECOND_LANGUAGE),
    ),
  };
}
