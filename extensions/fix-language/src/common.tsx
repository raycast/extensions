import { showToast, Toast, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import langMapper from "./languageMap";
import { createMapping } from "./languageMap";
import { isValidLanguagePair, LanguagePreferences } from "./preferences-utils";

export function getSetting(): LanguagePreferences {
  const preferences = getPreferenceValues<LanguagePreferences>();
  if (!isValidLanguagePair(preferences.firstLang, preferences.secondLang)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Language Selection",
      message: "First and second languages must be different",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return { firstLang: "en", secondLang: "th" };
  }
  return preferences;
}

export function showToastError(errorText: string) {
  showToast({
    style: Toast.Style.Failure,
    title: "Booom 💥",
    message: errorText,
  });
}

export function detectPredominantLanguage(text: string): string {
  // Define regex patterns for Thai and English characters
  const thaiPattern = /[\u0E00-\u0E7F]/g;
  const englishPattern = /[a-zA-Z]/g;

  // Match the characters and count them
  const thaiMatches = text.match(thaiPattern) || [];
  const englishMatches = text.match(englishPattern) || [];

  // Determine the predominant language
  if (thaiMatches.length > englishMatches.length) {
    return "th"; // Thai
  } else if (englishMatches.length > thaiMatches.length) {
    return "en"; // English
  } else {
    return "mixed"; // Equal or no matches
  }
}

export function getKeyboardLayoutMapperByText(text: string): Record<string, string> {
  // const lang = text.match(/[\u0E00-\u0E7F]/) ? "th" : "en";
  let lang = detectPredominantLanguage(text);
  const setting = getSetting();
  if (lang === "mixed") {
    lang = setting.firstLang;
  }
  const mapping = createMapping(
    langMapper[lang === setting.firstLang ? setting.secondLang : setting.firstLang],
    langMapper[lang],
  );
  return mapping;
}

export function switchLanguage(text: string): string {
  const mapper = getKeyboardLayoutMapperByText(text);
  return text
    .split("")
    .map((char) => mapper[char] || char)
    .join("");
}
