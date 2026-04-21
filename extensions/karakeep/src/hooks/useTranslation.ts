import { useCallback, useEffect, useState } from "react";
import { Language, translations } from "../i18n";
import { useConfig } from "./useConfig";
import { translate } from "../i18n/translate";

export function useTranslation() {
  const { config } = useConfig();
  const [language, setLanguage] = useState<Language>((config?.language as Language) || "en");

  const t = useCallback(
    (
      key: string,
      params?: {
        searchText?: string;
        count?: number;
        [key: string]: string | number | undefined;
      },
    ): string => {
      return translate(translations[language], key, params);
    },
    [language],
  );

  useEffect(() => {
    const newLanguage = config?.language as Language | undefined;
    if (newLanguage && newLanguage !== language) {
      setLanguage(newLanguage);
    }
  }, [config?.language, language]);

  return {
    t,
    language,
    setLanguage,
  };
}
