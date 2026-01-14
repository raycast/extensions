import React from "react";
import { tr } from "./tr";
import { en } from "./en";

export type Locale = "tr" | "en";
export type Translations = typeof tr;

const translations: Record<Locale, Translations> = {
  tr,
  en,
};

function detectSystemLocale(): Locale {
  try {
    const systemLang = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = systemLang.toLowerCase().split("-")[0];
    return langCode === "tr" ? "tr" : "en";
  } catch {
    return "en";
  }
}

async function loadSavedLocale(): Promise<Locale | null> {
  try {
    const { getPreferenceValues, LocalStorage } = await import("@raycast/api");
    const { STORAGE_KEYS } = await import("../constants");

    // Try preferences first
    try {
      const preferences = getPreferenceValues<{ language?: string }>();
      if (preferences.language === "tr" || preferences.language === "en") {
        return preferences.language as Locale;
      }
    } catch {
      // Ignore preference errors
    }

    // Fallback to localStorage
    const data = await LocalStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (data) {
      const settings = JSON.parse(data as string) as { language?: string };
      if (settings.language === "tr" || settings.language === "en") {
        return settings.language as Locale;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

let currentLocale: Locale = detectSystemLocale();

loadSavedLocale().then((savedLocale) => {
  if (savedLocale) {
    currentLocale = savedLocale;
  }
});

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(): Translations {
  return translations[currentLocale];
}

export function useI18n() {
  const [locale, setLocaleState] = React.useState<Locale>(currentLocale);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadLocale() {
      try {
        const savedLocale = await loadSavedLocale();
        const finalLocale = savedLocale ?? detectSystemLocale();
        currentLocale = finalLocale;
        setLocaleState(finalLocale);
      } catch {
        const detectedLocale = detectSystemLocale();
        currentLocale = detectedLocale;
        setLocaleState(detectedLocale);
      } finally {
        setIsLoading(false);
      }
    }
    loadLocale();
  }, []);

  return {
    t: translations[locale],
    locale,
    isLoading,
    setLocale: (newLocale: Locale) => {
      currentLocale = newLocale;
      setLocaleState(newLocale);
    },
  };
}
