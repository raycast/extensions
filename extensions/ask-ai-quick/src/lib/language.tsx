import { LanguageSet } from "./hooks";
import supportedLanguages from "./supportedLanguages.json";

export type LanguagesItem = {
  code: string;
  name: string;
  flag?: string;
};

export const getLanguageFlag = (language: string, fallback = "🌐") => {
  return supportedLanguages.find((item) => item.code === language)?.flag ?? fallback;
};

export const languages: LanguagesItem[] = supportedLanguages;

export const formatLanguageSet = (langset: LanguageSet) => {
  return `${langset.source}${getLanguageFlag(langset.source)} -> ${getLanguageFlag(langset.target)}${langset.target}`;
};
