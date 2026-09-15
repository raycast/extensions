/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DisplaySection } from "@/types/display";
import type { TranslationQueryResult } from "@/types/query";

import type { QueryState } from "./queryReducer";
import {
  getDictionaryShowMoreDetailsMarkdown,
  getFromToLanguageTitle,
  getTranslationMarkdown,
  getTranslationShowMoreDetailsMarkdown,
} from "./utils";

export function computeDisplaySections(state: QueryState): DisplaySection[] {
  const { queryResults, isShowDetail } = state;

  const translations: Array<{ serviceId: string; text: string }> = [];
  for (const qr of queryResults) {
    if ("translations" in qr) {
      if (qr.hideDisplay) continue;
      const markdown = getTranslationMarkdown(qr, qr.serviceLabel);
      translations.push({ serviceId: qr.serviceId, text: markdown });
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

      const detailsMarkdown = isTrans
        ? buildDetailMarkdown(translations, queryResult)
        : section.items?.[0]?.detailsMarkdown;

      displaySections.push({
        ...section,
        serviceId,
        sectionTitle,
        items: section.items.map((item, idx) => {
          const identifiedItem = { ...item, serviceId, serviceLabel, serviceIcon };
          const displayItem = idx === 0 ? { ...identifiedItem, detailsMarkdown } : identifiedItem;
          const showMoreDetailsMarkdown = isTrans
            ? getTranslationShowMoreDetailsMarkdown(displayItem)
            : getDictionaryShowMoreDetailsMarkdown(displayItem);
          return { ...displayItem, showMoreDetailsMarkdown };
        }),
      });
    }
  }

  return displaySections;
}

/**
 * Build detail markdown for translation type. Puts current type's translation first.
 */
function buildDetailMarkdown(
  translations: Array<{ serviceId: string; text: string }>,
  queryResult: TranslationQueryResult,
): string {
  const sorted = [...translations];
  const idx = sorted.findIndex((translation) => translation.serviceId === queryResult.serviceId);
  if (idx > 0) {
    const [item] = sorted.splice(idx, 1);
    sorted.unshift(item);
  }
  return sorted.map((t) => t.text).join("\n");
}
