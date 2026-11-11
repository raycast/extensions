/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getWiktionaryLanguage } from "@/core/language/utils";
import type { QueryInput } from "@/core/results/types";
import { checkIsWord } from "@/providers/shared/utils";

export function getWiktionaryTitle(word: string): string {
  return encodeURIComponent(word.trim().replace(/ /g, "_"));
}

export function getWiktionaryEntryURL(word: string, heading?: string): string {
  const page = `https://en.wiktionary.org/wiki/${getWiktionaryTitle(word)}`;
  return heading ? `${page}#${encodeURIComponent(heading.replace(/ /g, "_"))}` : page;
}

export function getWiktionaryWebURL(queryWordInfo: QueryInput): string | undefined {
  if (!checkIsWord(queryWordInfo)) return undefined;
  const { names } = getWiktionaryLanguage(queryWordInfo.fromLanguage);
  return getWiktionaryEntryURL(queryWordInfo.word, names.length === 1 ? names[0] : undefined);
}
