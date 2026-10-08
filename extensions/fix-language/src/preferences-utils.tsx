import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";

export interface LanguagePreferences {
  firstLang: string;
  secondLang: string;
}

export function validateAndGetPreferences(): LanguagePreferences | null {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (preferences["firstLang"] === preferences["secondLang"]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Language Selection",
        message: "First and second languages must be different",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
      return null;
    }

    return preferences;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error Loading Preferences",
      message: "Please check your language settings",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return null;
  }
}

export function isValidLanguagePair(firstLang: string, secondLang: string): boolean {
  return firstLang !== secondLang;
}
