import { useState, useEffect, useCallback, useRef } from "react";
import { LocalStorage } from "@raycast/api";
import { translations, Language } from "../i18n";
import { useConfig } from "./useConfig";

export function useTranslation() {
  const { config, updateConfig } = useConfig();
  const [language, setLanguage] = useState<Language>((config?.language as Language) || "en");
  const [t, setT] = useState(translations[language]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const cachedLanguage = await LocalStorage.getItem<Language>("language");
        if (cachedLanguage && cachedLanguage !== language) {
          setLanguage(cachedLanguage);
          setT(translations[cachedLanguage]);
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
        await updateConfig({ language: newLanguage });
        await LocalStorage.setItem("language", newLanguage);
      }
    },
    [language, updateConfig],
  );

  return {
    t,
    language,
    setLanguage: changeLanguage,
  };
}
