import { useMemo } from "react";
import { supportedLanguages } from "../constants";
import { Language, LanguageCode } from "../types";

const loadLanguages = () => {
  const results: Partial<Record<LanguageCode, Language>> = {};
  for (const [key, language] of Object.entries(supportedLanguages) as [LanguageCode, Language][]) {
    results[key] = { ...language, icon: language.icon || "🇺🇳" };
  }
  return results;
};
const getLanguages = () => {
  return useMemo(() => loadLanguages(), []);
};
export default getLanguages;
