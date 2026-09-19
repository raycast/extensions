/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DisplaySection } from "@/types/display";
import type { TranslationQueryResult } from "@/types/query";

import type { QueryState } from "./queryReducer";
import { resultItemBody, translationResultsMarkdown } from "./resultMarkdown";
import { getFromToLanguageTitle } from "./utils";

export function computeDisplaySections(state: QueryState): DisplaySection[] {
  const { queryResults, isShowDetail } = state;

  const translations: TranslationQueryResult[] = [];
  for (const qr of queryResults) {
    if ("translations" in qr) {
      if (qr.hideDisplay) continue;
      translations.push(qr);
    }
  }

  let isPreviousSectionTranslationType = false;
  const displaySections: DisplaySection[] = [];

  for (const queryResult of queryResults) {
    if ("hideDisplay" in queryResult && queryResult.hideDisplay) continue;

    const { serviceId, serviceLabel, serviceIcon } = queryResult;
    const isTrans = "translations" in queryResult;
    let isFirstDictSection = true;

    for (const section of queryResult.displaySections) {
      let sectionTitle: string | undefined = serviceLabel;
      const wordInfo = queryResult.queryWordInfo;
      const fromTo = getFromToLanguageTitle(wordInfo.fromLanguage, wordInfo.toLanguage, isShowDetail);
      if (isTrans) {
        sectionTitle = isPreviousSectionTranslationType ? sectionTitle : `${sectionTitle}   (${fromTo})`;
        isPreviousSectionTranslationType = true;
      } else {
        if (isFirstDictSection) {
          sectionTitle = `${sectionTitle}   (${fromTo})`;
          isFirstDictSection = false;
        } else {
          sectionTitle = section.sectionTitle;
        }
        isPreviousSectionTranslationType = false;
      }

      const translationPreview = isTrans ? buildDetailMarkdown(translations, queryResult) : undefined;

      displaySections.push({
        ...section,
        serviceId,
        sectionTitle,
        items: section.items.map((item, idx) => ({
          ...item,
          serviceId,
          serviceLabel,
          serviceIcon,
          fromCache: queryResult.fromCache,
          detailsMarkdown: isTrans ? (idx === 0 ? translationPreview : item.detailsMarkdown) : resultItemBody(item),
        })),
      });
    }
  }

  return displaySections;
}

/**
 * Build detail markdown for translation type. Puts current type's translation first.
 */
function buildDetailMarkdown(translations: TranslationQueryResult[], queryResult: TranslationQueryResult): string {
  const sorted = [...translations];
  const idx = sorted.findIndex((translation) => translation.serviceId === queryResult.serviceId);
  if (idx > 0) {
    const [item] = sorted.splice(idx, 1);
    sorted.unshift(item);
  }
  return translationResultsMarkdown(
    queryResult.queryWordInfo,
    sorted.map((result) => ({
      label: result.serviceLabel,
      text: result.translations.join("\n"),
      info: result.queryWordInfo,
    })),
  );
}
