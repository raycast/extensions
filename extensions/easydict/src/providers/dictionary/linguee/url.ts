/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLanguageEnglishName } from "@/core/language/utils";
import type { QueryInput } from "@/core/results/types";
import { checkIsWord } from "@/providers/shared/utils";

import { getValidLingueeLanguagePair } from "./languages";

export function getLingueeWebDictionaryURL(queryWordInfo: QueryInput): string | undefined {
  const { fromLanguage, toLanguage } = queryWordInfo;
  const validLanguagePair = getValidLingueeLanguagePair(fromLanguage, toLanguage);
  const isWord = checkIsWord(queryWordInfo);

  if (!validLanguagePair || !isWord) return undefined;

  const sourceLanguage = getLanguageEnglishName(fromLanguage).toLowerCase();
  return `https://www.linguee.com/${validLanguagePair}/search?source=${sourceLanguage}&query=${encodeURIComponent(queryWordInfo.word)}`;
}
