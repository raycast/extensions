import { LocalStorage, getPreferenceValues } from "@raycast/api";

export type AppPreferences = {
  apiKey: string;
  primaryLanguage: string;
  secondaryLanguage: string;
};

export type LanguagePreferences = Pick<AppPreferences, "primaryLanguage" | "secondaryLanguage">;

const PRIMARY_LANGUAGE_KEY = "configured-primary-language";
const SECONDARY_LANGUAGE_KEY = "configured-secondary-language";

export async function getLanguagePreferences(): Promise<LanguagePreferences | undefined> {
  const [primaryLanguage, secondaryLanguage] = await Promise.all([
    LocalStorage.getItem<string>(PRIMARY_LANGUAGE_KEY),
    LocalStorage.getItem<string>(SECONDARY_LANGUAGE_KEY),
  ]);

  if (!primaryLanguage || !secondaryLanguage) return undefined;
  return { primaryLanguage, secondaryLanguage };
}

export async function saveLanguagePreferences(preferences: LanguagePreferences) {
  await Promise.all([
    LocalStorage.setItem(PRIMARY_LANGUAGE_KEY, preferences.primaryLanguage),
    LocalStorage.setItem(SECONDARY_LANGUAGE_KEY, preferences.secondaryLanguage),
  ]);
}

export async function getConfiguredPreferences(): Promise<AppPreferences | undefined> {
  const languages = await getLanguagePreferences();
  if (!languages) return undefined;

  const { apiKey } = getPreferenceValues<Preferences>();
  return { apiKey, ...languages };
}
