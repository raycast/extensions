/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { chineseLanguageItem } from "@/core/language/consts";
import { maxLineLengthOfChineseTextDisplay, maxLineLengthOfEnglishTextDisplay } from "@/core/language/utils";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryResult, TranslationResult } from "@/core/results/types";

import type { PrimarySupplement } from "./types";

type CompositionPreferences = Pick<
  Preferences,
  "enableDeepLTranslate" | "enableYoudaoDictionary" | "enableYoudaoTranslate"
>;

export type ComposedService = QueryResult & {
  readonly primarySupplement?: PrimarySupplement;
};

export interface ComposedContent {
  readonly services: readonly ComposedService[];
  readonly isShowDetail: boolean;
}

/** Compose already ordered results without changing the single-service content retained by the runner or cache. */
export function composeContent(results: readonly QueryResult[], preferences: CompositionPreferences): ComposedContent {
  const translations = results.filter(
    (result): result is QueryResult & TranslationResult => result.content.kind === "translation",
  );
  const deepLText = translations.find((result) => result.type === TranslationType.DeepL)?.content.paragraphs.join(", ");
  const youdaoText = translations
    .find((result) => result.type === TranslationType.Youdao)
    ?.content.paragraphs.join(", ");
  const youdaoInfo = results.find(
    (result) => result.type === DictionaryType.Youdao && result.content.kind === "dictionary",
  )?.content.query;
  const isShowDetail =
    translations.length === results.length &&
    translations.some(({ content }) => {
      const limit =
        content.query.toLanguage === chineseLanguageItem.youdaoLangCode
          ? maxLineLengthOfChineseTextDisplay
          : maxLineLengthOfEnglishTextDisplay;
      return content.paragraphs.join(", ").length > limit;
    });

  const services: ComposedService[] = [];
  for (const result of results) {
    if (result.content.kind === "translation") {
      if (
        (result.type === TranslationType.DeepL && !preferences.enableDeepLTranslate) ||
        (result.type === TranslationType.Youdao &&
          preferences.enableYoudaoDictionary &&
          !preferences.enableYoudaoTranslate)
      )
        continue;
      services.push(result);
      continue;
    }

    const translation =
      result.type === DictionaryType.Linguee
        ? deepLText
        : result.type === DictionaryType.Youdao && result.content.sections.length >= 2
          ? youdaoText
          : undefined;
    const info = result.type === DictionaryType.Linguee ? youdaoInfo : undefined;
    const hasMetadata = Boolean(info?.phonetic || info?.examTypes?.length);
    if (translation || hasMetadata) {
      services.push({
        ...result,
        primarySupplement: {
          ...(translation ? { translation } : {}),
          ...(hasMetadata ? { phonetic: info?.phonetic, examTypes: info?.examTypes } : {}),
        },
      });
    } else {
      services.push(result);
    }
  }

  return { services, isShowDetail };
}
