import { useState, useEffect, useCallback, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { translations, Language } from "../i18n";
import { useConfig } from "./useConfig";
import { Preferences } from "../types";

export function useTranslation() {
  const { config } = useConfig();
  const [language, setLanguage] = useState<Language>((config?.language as Language) || "en");
  const [t, setT] = useState(translations[language]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const language = preferences.language as Language;
        if (language && language !== language) {
          setLanguage(language);
          setT(translations[language]);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadLanguage();
    }
  }, [language]);

  useEffect(() => {
    if (!isInitialMount.current && config?.language && config.language !== language) {
      setLanguage(config.language as Language);
      setT(translations[config.language as Language]);
    }
  }, [config?.language]);

  const changeLanguage = useCallback(
    async (newLanguage: Language) => {
      if (newLanguage !== language) {
        setLanguage(newLanguage);
        setT(translations[newLanguage]);
      }
    },
    [language],
  );

  return {
    t,
    language,
    setLanguage: changeLanguage,
  };
}
