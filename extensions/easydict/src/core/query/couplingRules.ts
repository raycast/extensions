/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

/**
 * Declarative cross-service coupling rules.
 *
 * When a provider returns a result, it may need to update a related provider's display.
 * Each rule declares which query types trigger it, and how to transform the results array.
 *
 * The reducer in queryReducer.ts iterates COUPLING_RULES on every SET_RESULT action,
 * replacing the previous hardcoded if-statements.
 */

import { DictionaryType, TranslationType } from "@/types/api";
import type { DictionaryQueryResult, QueryResult, QueryType, TranslationQueryResult } from "@/types/query";

/** A rule that fires when any of its trigger types arrives. */
export interface ServiceCouplingRule {
  /** Query types that activate this rule (e.g., [DeepL, Linguee]). */
  triggers: QueryType[];
  /** Pure transform: receives the full results array, returns the updated array. */
  apply: (results: QueryResult[]) => QueryResult[];
}

/**
 * Copy translation text from a source provider into a target dictionary's first display item.
 *
 * Used by DeepL → Linguee and Youdao → Youdao Dictionary couplings, where the translation
 * result should also appear as the dictionary entry's title.
 */
export function applyTranslationToDisplay(
  results: QueryResult[],
  sourceType: TranslationType,
  targetType: DictionaryType,
  options?: { minSections?: number },
): QueryResult[] {
  const source = results.find(
    (result): result is TranslationQueryResult => "translations" in result && result.type === sourceType,
  );
  const target = results.find(
    (result): result is DictionaryQueryResult => !("translations" in result) && result.type === targetType,
  );

  if (!source || !target) return results;

  const text = source.translations.join(", ");
  if (!text) return results;

  // Immutable update: drill down results → first section → first item, copy each layer
  return results.map((r) => {
    if ("translations" in r || r.type !== targetType) return r;
    if (options?.minSections && r.displaySections.length < options.minSections) return r;

    const updatedSections = r.displaySections.map((section, idx) => {
      if (idx !== 0 || !section.items?.length) return section; // only update the first section
      const updatedItems = section.items.map((item, itemIdx) => {
        if (itemIdx !== 0) return item; // only update the first item
        let detailsMarkdown = text;
        if (item.subtitle && !item.subtitle.startsWith(text)) {
          detailsMarkdown = `${text} ${item.subtitle}`;
        } else if (item.subtitle) {
          detailsMarkdown = item.subtitle;
        }

        return { ...item, title: text, copyText: text, detailsMarkdown };
      });
      return { ...section, items: updatedItems };
    });
    return { ...r, displaySections: updatedSections };
  });
}

/**
 * Sync Youdao dictionary metadata (phonetic, examTypes) to Linguee's accessoryItem.
 *
 * When Youdao dictionary returns phonetic/examTypes, those should also appear
 * on Linguee's display so users see consistent word info across both dictionaries.
 */
export function applyMetadataToLinguee(results: QueryResult[], youdaoResult: DictionaryQueryResult): QueryResult[] {
  const { phonetic, examTypes } = youdaoResult.queryWordInfo;
  // Only apply when there's actual metadata to sync
  if (!phonetic && !examTypes?.length) return results;

  const linguee = results.find(
    (result): result is DictionaryQueryResult => !("translations" in result) && result.type === DictionaryType.Linguee,
  );
  if (!linguee) return results;

  // Immutable update: drill down results → first section → first item → accessoryItem
  return results.map((r) => {
    if ("translations" in r || r.type !== DictionaryType.Linguee) return r;

    const updatedSections = r.displaySections.map((section, idx) => {
      if (idx !== 0 || !section.items?.length) return section; // only update the first section
      const updatedItems = section.items.map((item, itemIdx) => {
        if (itemIdx !== 0) return item; // only update the first item
        // merge phonetic/examTypes into existing accessoryItem (spread preserves other fields)
        return { ...item, accessoryItem: { ...item.accessoryItem, phonetic, examTypes } };
      });
      return { ...section, items: updatedItems };
    });
    return { ...r, displaySections: updatedSections };
  });
}

/**
 * All coupling rules. Each rule's `triggers` array determines which SET_RESULT
 * actions activate it. The reducer loops through these on every result update.
 */
export const COUPLING_RULES: ServiceCouplingRule[] = [
  /** DeepL translation → update Linguee dictionary's first item title. */
  {
    triggers: [TranslationType.DeepL, DictionaryType.Linguee],
    apply: (results) => applyTranslationToDisplay(results, TranslationType.DeepL, DictionaryType.Linguee),
  },
  /** Youdao translation → update Youdao dictionary's first item title (requires ≥2 sections). */
  {
    triggers: [TranslationType.Youdao, DictionaryType.Youdao],
    apply: (results) =>
      applyTranslationToDisplay(results, TranslationType.Youdao, DictionaryType.Youdao, { minSections: 2 }),
  },
  /** Youdao dictionary metadata (phonetic, examTypes) → sync to Linguee's accessoryItem. */
  {
    triggers: [DictionaryType.Youdao, DictionaryType.Linguee],
    apply: (results) => {
      const youdaoResult = results.find(
        (result): result is DictionaryQueryResult =>
          !("translations" in result) && result.type === DictionaryType.Youdao,
      );
      return youdaoResult ? applyMetadataToLinguee(results, youdaoResult) : results;
    },
  },
];
