/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { DictionaryType } from "@/types/api";
import type { DisplaySection, ListDisplayItem } from "@/types/display";
import type { QueryWordInfo } from "@/types/query";

import type {
  LingueeDictionaryResult,
  LingueeExample,
  LingueeWikipedia,
  LingueeWordExplanation,
  LingueeWordItem,
} from "./types";
import { LingueeListItemType } from "./types";

const MAX_EXAMPLES = 3;
const MAX_RELATED_WORDS = 3;

function createDisplayItem(
  queryWordInfo: QueryWordInfo,
  displayType: LingueeListItemType,
  title: string,
  subtitle: string,
): ListDisplayItem {
  const copyText = `${title} ${subtitle}`;
  return {
    key: copyText,
    title,
    subtitle,
    copyText,
    queryWordInfo,
    displayType,
    queryType: DictionaryType.Linguee,
    tooltip: displayType,
    detailsMarkdown: copyText,
  };
}

function partitionFeatured(items: LingueeWordExplanation[]): [LingueeWordExplanation[], LingueeWordExplanation[]] {
  const featured: LingueeWordExplanation[] = [];
  const unfeatured: LingueeWordExplanation[] = [];
  for (const item of items) {
    (item.featured ? featured : unfeatured).push(item);
  }
  return [featured, unfeatured];
}

function buildTitleSection(queryWordInfo: QueryWordInfo, wordItems: LingueeWordItem[]): DisplaySection {
  const word = queryWordInfo.word;
  const translation = wordItems[0]?.translationItems[0]?.translation ?? word;
  return {
    type: LingueeListItemType.Translation,
    sectionTitle: DictionaryType.Linguee,
    items: [createDisplayItem(queryWordInfo, LingueeListItemType.Translation, translation, word)],
  };
}

function buildFeaturedExplanationItems(
  queryWordInfo: QueryWordInfo,
  explanations: LingueeWordExplanation[],
): ListDisplayItem[] {
  return explanations
    .filter((item) => item.featured)
    .map((item) => {
      const isCommon = item.frequencyTag.displayType === LingueeListItemType.Common;
      const tagText = isCommon ? "" : `  ${item.frequencyTag.tagForms}`;
      const exampleTranslation = item.examples[0]?.translations[0]?.text ?? "";
      let pos = item.pos;
      if (pos && (tagText || exampleTranslation)) {
        pos = `${pos}.`;
      }
      const subtitle = `${pos}${tagText}       ${exampleTranslation}`;
      return createDisplayItem(queryWordInfo, item.frequencyTag.displayType, item.translation, subtitle);
    });
}

function buildUnfeaturedExplanationItem(
  queryWordInfo: QueryWordInfo,
  unfeatured: LingueeWordExplanation[],
): ListDisplayItem | undefined {
  if (unfeatured.length === 0) return undefined;
  const lastItem = unfeatured.at(-1)!;
  const pos = lastItem.pos ? `${lastItem.pos}.` : "";
  const subtitleText = unfeatured.map((item) => item.translation).join(";  ");
  const isLessCommon = lastItem.frequencyTag.displayType === LingueeListItemType.LessCommon;
  const lessCommonNote = isLessCommon ? `(${LingueeListItemType.LessCommon})` : "";
  const displayType = isLessCommon ? LingueeListItemType.LessCommon : LingueeListItemType.Unfeatured;
  return createDisplayItem(queryWordInfo, displayType, pos, `${subtitleText}  ${lessCommonNote.toLowerCase()}`);
}

function buildWordItemSections(queryWordInfo: QueryWordInfo, wordItems: LingueeWordItem[]): DisplaySection[] {
  return wordItems.map((wordItem) => {
    const endsWithDot = wordItem.placeholder.endsWith(".");
    const wordPos = wordItem.pos ? (endsWithDot ? `  ${wordItem.pos}` : `.${wordItem.pos}`) : "";
    const placeholderText = wordItem.placeholder ? ` ${wordItem.placeholder}` : "";
    const sectionTitle = `${wordItem.word}${placeholderText}${wordPos}`;

    const [featured, unfeatured] = partitionFeatured(wordItem.translationItems ?? []);
    const featuredItems = buildFeaturedExplanationItems(queryWordInfo, featured);
    const unfeaturedItem = buildUnfeaturedExplanationItem(queryWordInfo, unfeatured);

    return {
      type: LingueeListItemType.Common,
      sectionTitle,
      items: unfeaturedItem ? [...featuredItems, unfeaturedItem] : featuredItems,
    };
  });
}

function buildExampleSection(queryWordInfo: QueryWordInfo, examples: LingueeExample[]): DisplaySection | undefined {
  if (!examples?.length) return undefined;
  const items = examples.slice(0, MAX_EXAMPLES).map((example) => {
    const pos = example.example.pos ? `${example.example.pos}.  ` : "";
    const translations = example.translations.map((t) => t.text).join(";  ");
    return createDisplayItem(
      queryWordInfo,
      LingueeListItemType.Example,
      example.example.text,
      `${pos}—  ${translations}`,
    );
  });
  return { type: LingueeListItemType.Example, sectionTitle: "Examples:", items };
}

function buildRelatedWordSection(
  queryWordInfo: QueryWordInfo,
  relatedWords: LingueeWordItem[],
): DisplaySection | undefined {
  if (!relatedWords?.length) return undefined;
  const items = relatedWords.slice(0, MAX_RELATED_WORDS).map((word) => {
    const explanations =
      word.translationItems?.map((item) => item.translation).join(";  ") ?? `${word.placeholder} ${word.pos}`;
    const pos = word.pos ? `${word.pos}.  ` : "";
    return createDisplayItem(queryWordInfo, LingueeListItemType.RelatedWord, word.word, `${pos}${explanations}`);
  });
  return { type: LingueeListItemType.RelatedWord, sectionTitle: "Related words:", items };
}

function buildWikipediaSection(
  queryWordInfo: QueryWordInfo,
  wikipedias: LingueeWikipedia[],
): DisplaySection | undefined {
  if (!wikipedias?.length) return undefined;
  const items = wikipedias.map((wiki) => {
    const text = `${wiki.title} ${wiki.explanation}`;
    return createDisplayItem(queryWordInfo, LingueeListItemType.Wikipedia, text, "");
  });
  return { type: LingueeListItemType.Wikipedia, sectionTitle: "Wikipedia", items };
}

export function formatLingueeDisplaySections(
  queryWordInfo: QueryWordInfo,
  result: LingueeDictionaryResult | undefined,
): DisplaySection[] {
  if (!result) return [];

  const { wordItems, examples, relatedWords, wikipedias } = result;

  return [
    buildTitleSection(queryWordInfo, wordItems),
    ...buildWordItemSections(queryWordInfo, wordItems),
    buildExampleSection(queryWordInfo, examples),
    buildRelatedWordSection(queryWordInfo, relatedWords),
    buildWikipediaSection(queryWordInfo, wikipedias),
  ].filter((section): section is DisplaySection => section !== undefined);
}
