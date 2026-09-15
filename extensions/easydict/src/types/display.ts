/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ProviderIconConfig } from "@/ai-providers/types";
import type { AIDictionaryListItemType } from "@/providers/dictionary/ai/types";
import type { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import type { YoudaoDictionaryListItemType } from "@/providers/dictionary/youdao/types";

import type { DictionaryType, TranslationType } from "./api";
import type { QueryType, QueryWordInfo } from "./query";

export type DictionaryDisplayType = AIDictionaryListItemType | LingueeListItemType | YoudaoDictionaryListItemType;

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
  queryType: QueryType;
  queryWordInfo: QueryWordInfo;
  key: string;
  title: string;
  subtitle?: string;
  copyText: string;
  tooltip?: string;
  detailsMarkdown?: string;
  showMoreDetailsMarkdown?: string;
  accessoryItem?: ListAccessoryItem;
}

export type ListDisplayItem = ListDisplayItemBase &
  (
    | { queryType: DictionaryType.Linguee; displayType: LingueeListItemType }
    | { queryType: DictionaryType.Youdao; displayType: YoudaoDictionaryListItemType }
    | { queryType: DictionaryType.AI; displayType: AIDictionaryListItemType }
    | { queryType: TranslationType; displayType?: never }
  );

export interface ListAccessoryItem {
  phonetic?: string;
  examTypes?: string[];
  example?: string;
}
