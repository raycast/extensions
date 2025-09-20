import { LocalStorage, getPreferenceValues } from "@raycast/api";
import supportedLanguages from "./data/supportedLanguages";
import { Language, Preferences } from "./types";

export const usePreferences = () => {
  return getPreferenceValues<Preferences>();
};

export const getUserSelectedLanguages = async () => {
  const preference = usePreferences();

  const selectedLanguages = await LocalStorage.getItem("SelectedLanguages");

  const primaryLanguage = {
    title:
      supportedLanguages.find(
        (lang) => lang.value === preference.primaryLanguage,
      )?.title ?? "🇺🇸 English (US)",
    value: preference.primaryLanguage,
    isDefault: true,
  } as Language;

  let userSelectedLanguages: Language[] = [];

  if (typeof selectedLanguages !== "undefined") {
    const selectedLanguagesParsed = JSON.parse(
      selectedLanguages as unknown as string,
    ) as Language[];
    userSelectedLanguages = selectedLanguagesParsed;
    return userSelectedLanguages;
  }

  const languages: Language[] = [primaryLanguage];
  return languages;
};
