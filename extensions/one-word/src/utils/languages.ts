import { useMemo } from "react";
import { LANGUAGES } from "../constants";
import { Language, LanguageCode } from "../types";

const UNITED_NATIONS_FLAG = "🇺🇳";

const loadLanguages = (): Record<LanguageCode, Language> => {
  return Object.entries(LANGUAGES).reduce(
    (acc, [key, language]) => {
      acc[key as LanguageCode] = { ...language, icon: (language as Language).icon || UNITED_NATIONS_FLAG };
      return acc;
    },
    {} as Record<LanguageCode, Language>,
  );
};

export const getLanguages = (): [Record<LanguageCode, Language>, Language[]] => {
  const languages = useMemo(() => loadLanguages(), []);
  return [languages, Object.values(languages)];
};
