/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { decodeIcon } from "@/core/results/decode";
import {
  boolean,
  decodeQueryWordInfo,
  invalid,
  member,
  optional,
  record,
  strings,
  text,
} from "@/core/results/decodeFields";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { ProviderIconConfig, QueryWordInfo } from "@/core/results/types";

enum AIDictionaryListItemType {
  Translation = "Translation",
  Definition = "Definition",
  Forms = "Forms",
}

enum LingueeListItemType {
  AlmostAlwaysUsed = "Almost Always Used",
  OftenUsed = "Often Used",
  Common = "Common",
  LessCommon = "Less Common",
  SpecialForms = "Forms",
  Unfeatured = "Unfeatured",
  Example = "Example",
  RelatedWord = "Related word",
  Wikipedia = "Wikipedia",
  Translation = "Translation",
}

enum YoudaoDictionaryListItemType {
  Translation = "Translation",
  Explanation = "Explanation",
  ModernChineseDict = "Modern Chinese Dict",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
  Baike = "Baike",
  Wikipedia = "Wikipedia",
}

type DictionaryDisplayType = AIDictionaryListItemType | LingueeListItemType | YoudaoDictionaryListItemType;

export interface DisplaySection {
  serviceId?: string;
  type: DictionaryDisplayType | TranslationType;
  sectionTitle?: string;
  items: ListDisplayItem[];
}

interface ListDisplayItemBase {
  serviceId?: string;
  serviceLabel?: string;
  serviceIcon?: ProviderIconConfig;
  queryWordInfo: QueryWordInfo;
  title: string;
  subtitle?: string;
  copyText: string;
  detailsMarkdown?: string;
  accessoryItem?: ListAccessoryItem;
}

export type ListDisplayItem = ListDisplayItemBase &
  (
    | { queryType: DictionaryType.Linguee; displayType: LingueeListItemType }
    | { queryType: DictionaryType.Youdao; displayType: YoudaoDictionaryListItemType }
    | { queryType: DictionaryType.AI; displayType: AIDictionaryListItemType }
    | { queryType: TranslationType; displayType?: never }
  );

interface ListAccessoryItem {
  phonetic?: string;
}

export function decodeDisplaySections(value: unknown): DisplaySection[] {
  if (!Array.isArray(value)) throw invalid("displaySections");
  return value.map((value) => {
    const source = record(value, "displaySection");
    const type = member(
      source.type,
      [
        ...Object.values(TranslationType),
        ...Object.values(AIDictionaryListItemType),
        ...Object.values(LingueeListItemType),
        ...Object.values(YoudaoDictionaryListItemType),
      ],
      "displaySection.type",
    );
    if (!Array.isArray(source.items)) throw invalid("displaySection.items");
    const items = source.items.map(decodeDisplayItem);
    const queryType = items[0]?.queryType;
    for (const item of items) {
      if (item.queryType !== queryType) throw invalid("displaySection.items.queryType");
      if (item.displayType === undefined) {
        if (type !== item.queryType) throw invalid("displaySection.type");
      } else {
        switch (item.queryType) {
          case DictionaryType.AI:
            member(type, Object.values(AIDictionaryListItemType), "displaySection.type");
            break;
          case DictionaryType.Linguee:
            member(type, Object.values(LingueeListItemType), "displaySection.type");
            break;
          case DictionaryType.Youdao:
            member(type, Object.values(YoudaoDictionaryListItemType), "displaySection.type");
            break;
        }
      }
    }
    return {
      type,
      items,
      serviceId: optional(source.serviceId, text, "displaySection.serviceId"),
      sectionTitle: optional(source.sectionTitle, text, "displaySection.sectionTitle"),
    };
  });
}

function decodeDisplayItem(value: unknown): ListDisplayItem {
  const source = record(value, "item");
  // Keep old storage validation even for fields the content converter no longer needs.
  text(source.key, "item.key");
  optional(source.tooltip, text, "item.tooltip");
  optional(source.fromCache, boolean, "item.fromCache");
  const fields = {
    queryWordInfo: decodeQueryWordInfo(source.queryWordInfo),
    title: text(source.title, "item.title"),
    copyText: text(source.copyText, "item.copyText"),
    subtitle: optional(source.subtitle, text, "item.subtitle"),
    detailsMarkdown: optional(source.detailsMarkdown, text, "item.detailsMarkdown"),
    accessoryItem: optional(source.accessoryItem, decodeAccessory, "item.accessoryItem"),
    serviceId: optional(source.serviceId, text, "item.serviceId"),
    serviceLabel: optional(source.serviceLabel, text, "item.serviceLabel"),
    serviceIcon: optional(source.serviceIcon, decodeIcon, "item.serviceIcon"),
  };
  switch (source.queryType) {
    case DictionaryType.AI:
      return {
        ...fields,
        queryType: source.queryType,
        displayType: member(source.displayType, Object.values(AIDictionaryListItemType), "item.displayType"),
      };
    case DictionaryType.Linguee:
      return {
        ...fields,
        queryType: source.queryType,
        displayType: member(source.displayType, Object.values(LingueeListItemType), "item.displayType"),
      };
    case DictionaryType.Youdao:
      return {
        ...fields,
        queryType: source.queryType,
        displayType: member(source.displayType, Object.values(YoudaoDictionaryListItemType), "item.displayType"),
      };
    default:
      if (source.displayType !== undefined) throw invalid("item.displayType");
      return { ...fields, queryType: member(source.queryType, Object.values(TranslationType), "item.queryType") };
  }
}

function decodeAccessory(value: unknown): ListAccessoryItem {
  const source = record(value, "item.accessoryItem");
  optional(source.examTypes, strings, "item.accessoryItem.examTypes");
  optional(source.example, text, "item.accessoryItem.example");
  return {
    phonetic: optional(source.phonetic, text, "item.accessoryItem.phonetic"),
  };
}
