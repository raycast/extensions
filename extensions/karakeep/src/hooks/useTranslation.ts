import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Language, translations } from "../i18n";
import { Preferences } from "../types";
import { useConfig } from "./useConfig";

type TranslationFunction = (searchText?: string, count?: number) => string;
type TranslationValue = string | TranslationFunction;
type TranslationsObject = { [key: string]: TranslationValue | TranslationsObject };

function isTranslationFunction(value: unknown): value is TranslationFunction {
  return typeof value === "function";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTranslationsObject(value: unknown): value is TranslationsObject {
  return typeof value === "object" && value !== null;
}

export function useTranslation() {
  const { config } = useConfig();
  const [language, setLanguage] = useState<Language>((config?.language as Language) || "en");
  const isInitialMount = useRef(true);

  const t = useCallback(
    (
      key: string,
      params?: {
        searchText?: string;
        count?: number;
        [key: string]: string | number | undefined;
      },
    ): string => {
      const keys = key.split(".");
      let current: unknown = translations[language];

      for (const k of keys) {
        if (isTranslationsObject(current) && k in current) {
          current = current[k];
        } else {
          return key;
        }
      }

      if (isTranslationFunction(current)) {
        return current(params?.searchText, params?.count);
      }

      if (isString(current)) {
        if (params) {
          return Object.entries(params).reduce(
            (str, [paramKey, value]) => str.replace(`{{${paramKey}}}`, String(value)),
            current,
          );
        }
        return current;
      }

      return key;
    },
    [language],
  );

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const prefLanguage = preferences.language as Language;
        if (prefLanguage && prefLanguage !== language) {
          setLanguage(prefLanguage);
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
    }
  }, [config?.language]);

  const changeLanguage = useCallback(
    async (newLanguage: Language) => {
      if (newLanguage !== language) {
        setLanguage(newLanguage);
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
