import _supportedLanguagesByCountry from "./supportedLanguages.json";
import _supportedLanguagesByCode from "./supportedLanguagesByCode.json";

export type LanguagesMapByCountry = typeof _supportedLanguagesByCountry;
export type LanguageCountries = keyof LanguagesMapByCountry;

export type LanguagesMapByCode = typeof _supportedLanguagesByCode;
export type LanguageCode = keyof LanguagesMapByCode;

export type LanguagesItem = {
  code: LanguageCode;
  name: string;
  flag?: string;
};

export const getLanguageFlag = (language?: LanguagesItem, fallback = "🏳️") => {
  return language?.flag ?? fallback;
};

export const getLanguageFlagByCode = (lang: LanguageCode) => {
  return getLanguageFlag(supportedLanguagesByCode[lang]);
};

export const supportedLanguagesByCode = _supportedLanguagesByCode as Record<LanguageCode, LanguagesItem>;
export const supportedLanguagesByCountry = _supportedLanguagesByCountry as Record<LanguageCountries, LanguagesItem>;

export const languages: LanguagesItem[] = Object.values(supportedLanguagesByCountry);
