import { Languages } from "dictcc";
import { TranslationInput } from "dictcc";

import { getPreferences } from "./preferences";

export const getListSubtitle = (loading: boolean, totalCount: number) =>
  loading ? "Loading..." : totalCount.toString();

export const joinStringsWithDelimiter: (values: (string | null | undefined)[], delimiter?: string) => string = (
  values,
  delimiter = ", "
): string => (values ? values.filter(Boolean).join(delimiter) : "");

export const getLanguage = (text: string) =>
  Object.values<string>(Languages).includes(text) ? Languages[text as Languages] : undefined;

export const createInputFromSearchTerm = (searchTerm: string): TranslationInput => {
  let term = searchTerm;

  let { sourceLanguage, targetLanguage } = getPreferences();

  // e.g. 'en de Home' => ["en", "de", "Home"], lang1 = "en", lang2 = "de", term = ".*"
  const split = term.trim().split(" ");
  if (split.length > 2) {
    const lang1 = getLanguage(split[0]);
    const lang2 = getLanguage(split[1]);

    if (lang1 && lang2) {
      sourceLanguage = lang1;
      targetLanguage = lang2;
      term = term.split(`${sourceLanguage} ${targetLanguage}`)[1];
    }
  }

  return {
    sourceLanguage,
    targetLanguage,
    term,
  };
};
