/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLangCode, getLanguageOfTwoExceptChinese } from "@/core/language/utils";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryInput } from "@/core/results/types";

import { getLingueeWebDictionaryURL } from "./dictionary/linguee/url";
import { getYoudaoWebDictionaryURL } from "./dictionary/youdao/utils";

function getDeepLWebURL(q: QueryInput): string | undefined {
  const from = getLangCode(q.fromLanguage, "deepLSourceId")?.toLowerCase();
  const to = getLangCode(q.toLanguage, "deepLSourceId")?.toLowerCase();
  return from && to ? `https://www.deepl.com/translator#${from}/${to}/${encodeURIComponent(q.word)}` : undefined;
}

/** Keep the existing action order independent of runtime provider ordering. */
export const webQueryServices: Array<{
  type: TranslationType | DictionaryType;
  getWebUrl: (query: QueryInput) => string | undefined;
}> = [
  {
    type: TranslationType.Baidu,
    getWebUrl: (q) => {
      const from = getLangCode(q.fromLanguage, "baiduLangCode");
      const to = getLangCode(q.toLanguage, "baiduLangCode");
      return from && to ? `https://fanyi.baidu.com/#${from}/${to}/${encodeURIComponent(q.word)}` : undefined;
    },
  },
  {
    type: TranslationType.Google,
    getWebUrl: (q) => {
      const from = getLangCode(q.fromLanguage, "googleLangCode");
      const to = getLangCode(q.toLanguage, "googleLangCode");
      return from && to
        ? `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(q.word)}&op=translate`
        : undefined;
    },
  },
  { type: TranslationType.DeepL, getWebUrl: getDeepLWebURL },
  { type: TranslationType.DeepLX, getWebUrl: getDeepLWebURL },
  { type: DictionaryType.Youdao, getWebUrl: getYoudaoWebDictionaryURL },
  { type: DictionaryType.Linguee, getWebUrl: getLingueeWebDictionaryURL },
  {
    type: DictionaryType.Eudic,
    getWebUrl: (q) => {
      const langCode = getLanguageOfTwoExceptChinese([q.fromLanguage, q.toLanguage]);
      if (langCode && ["en", "fr", "de", "es"].includes(langCode)) {
        return `https://dict.eudic.net/dicts/${langCode}/${encodeURIComponent(q.word)}`;
      }
    },
  },
];
