import { useMemo } from "react";
import en from "../constants/languages.json";

export type LanguageOption = {
  label: string;
  value: string;
};

const languageDataMap = {
  en: en.languages,
};

export default function useLanguageList(locale = "en"): LanguageOption[] {
  // Use useMemo to create language options only when locale changes
  const languageOptions = useMemo(() => {
    const languageData = languageDataMap[locale as keyof typeof languageDataMap] || languageDataMap.en;

    return Object.entries(languageData).map(([code, name]) => ({
      label: name as string,
      value: code,
    }));
  }, [locale]);

  return languageOptions;
}
