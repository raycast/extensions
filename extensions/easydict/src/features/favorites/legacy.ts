/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { plainText } from "@/core/content/markdown";
import type { DictionarySection } from "@/core/content/types";
import type { ViewRow } from "@/core/content/viewTypes";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import type { DisplaySection, ListDisplayItem } from "./legacyDisplay";
import type { FavoriteWord, SavedService } from "./model";

export interface LegacySavedRow extends Pick<
  ViewRow,
  "kind" | "title" | "subtitle" | "copyText" | "frequency" | "prominent" | "summarySource"
> {
  readonly bodyStyle?: "raw-text";
  readonly bodyMarkdown?: string;
  readonly phonetic?: string;
  /** A complete override; omitted optional fields must not inherit values from the service query. */
  readonly query?: QueryWordInfo;
}

export interface LegacySavedContent {
  readonly kind: "legacy";
  readonly role: "translation" | "dictionary";
  readonly query: QueryWordInfo;
  readonly sections: readonly {
    readonly kind: DictionarySection["kind"];
    readonly title?: string;
    readonly rows: readonly LegacySavedRow[];
  }[];
}

interface LegacyFavorite {
  readonly word: string;
  readonly fromLanguage: string;
  readonly toLanguage: string;
  readonly isWord?: boolean;
  readonly phonetic?: string;
  readonly createdAt: number;
  readonly translations?: readonly string[];
  readonly displaySections: readonly DisplaySection[];
}

function rowStyle(item: ListDisplayItem): Pick<LegacySavedRow, "kind" | "frequency" | "prominent" | "summarySource"> {
  switch (item.displayType) {
    case undefined:
    case "Translation":
      return { kind: "translation" };
    case "Explanation":
    case "Definition":
      return { kind: "definition" };
    case "Forms and Tenses":
      return { kind: "form-set" };
    case "Forms":
      return item.queryType === DictionaryType.Linguee
        ? { kind: "equivalent", frequency: "special-forms", prominent: true }
        : { kind: "form" };
    case "Web Phrase":
      return { kind: "phrase" };
    case "Web Translation":
      return { kind: "web-translation" };
    case "Related word":
      return { kind: "related" };
    case "Example":
      return { kind: "example" };
    case "Baike":
      return { kind: "summary", summarySource: "encyclopedia" };
    case "Wikipedia":
      return { kind: "summary", summarySource: "wikipedia" };
    case "Modern Chinese Dict":
      return { kind: "chinese-entry" };
    case "Common":
      return { kind: "equivalent", frequency: "common", prominent: true };
    case "Often Used":
      return { kind: "equivalent", frequency: "often", prominent: true };
    case "Almost Always Used":
      return { kind: "equivalent", frequency: "almost-always", prominent: true };
    case "Less Common":
      return { kind: "equivalent", frequency: "less-common", prominent: false };
    case "Unfeatured":
      return { kind: "equivalent", prominent: false };
  }
  throw new Error(`Unsupported saved dictionary row: ${item.displayType}`);
}

function sectionKind(section: DisplaySection): DictionarySection["kind"] {
  switch (section.type) {
    case "Translation":
      return "translation";
    case "Explanation":
    case "Definition":
      return "definitions";
    case "Forms and Tenses":
      return "form-set";
    case "Forms":
      return section.items[0]?.queryType === DictionaryType.Linguee ? "equivalents" : "pairs";
    case "Web Phrase":
    case "Web Translation":
    case "Related word":
      return "pairs";
    case "Example":
      return "examples";
    case "Baike":
    case "Wikipedia":
      return "summary";
    case "Modern Chinese Dict":
      return "chinese-entry";
    case "Common":
    case "Often Used":
    case "Almost Always Used":
    case "Less Common":
    case "Unfeatured":
      return "equivalents";
    default:
      return "translation";
  }
}

function isShortPair(item: ListDisplayItem): boolean {
  return (
    ["Forms", "Web Phrase", "Related word"].includes(item.displayType ?? "") &&
    Boolean(item.title && item.subtitle) &&
    item.title.length <= 80 &&
    (item.subtitle?.length ?? 0) <= 120
  );
}

function convertRow(item: ListDisplayItem, query: QueryWordInfo): LegacySavedRow {
  let bodyMarkdown: string | undefined;
  if (item.displayType && !["Translation", "Example"].includes(item.displayType) && !isShortPair(item)) {
    bodyMarkdown = item.detailsMarkdown;
    if (item.displayType === "Definition" && bodyMarkdown?.startsWith(`### ${item.title}\n`)) {
      bodyMarkdown = `**${plainText(item.title)}**${bodyMarkdown.slice(`### ${item.title}`.length)}`;
    }
  }
  return {
    ...rowStyle(item),
    title: item.title,
    subtitle: item.subtitle,
    copyText: item.copyText,
    bodyStyle: item.displayType === undefined ? "raw-text" : undefined,
    bodyMarkdown,
    phonetic: item.accessoryItem?.phonetic,
    query: JSON.stringify(item.queryWordInfo) === JSON.stringify(query) ? undefined : item.queryWordInfo,
  };
}

function legacyPreview(favorite: LegacyFavorite): readonly string[] | undefined {
  if (favorite.translations?.length) return favorite.translations;
  const item = favorite.displaySections.find((section) =>
    Object.values(TranslationType).some((type) => type === section.type),
  )?.items[0];
  if (item?.copyText) {
    const lines = item.copyText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length) return lines;
  }
  for (const section of favorite.displaySections) {
    for (const item of section.items) {
      if (item.displayType !== "Translation") continue;
      const title = item.title.trim();
      if (title && !(item.queryType === DictionaryType.Linguee && title === item.queryWordInfo.word.trim()))
        return [title];
    }
  }
  return undefined;
}

/** Convert only validated old snapshots. Old enums and whole-page Markdown stop at this boundary. */
export function convertLegacyFavorite(favorite: LegacyFavorite): FavoriteWord {
  const groups = new Map<string, DisplaySection[]>();
  for (const section of favorite.displaySections) {
    const item = section.items[0];
    if (!item) continue;
    const identity = section.serviceId ?? item.serviceId ?? item.queryType;
    const key = JSON.stringify([identity, item.queryWordInfo.fromLanguage, item.queryWordInfo.toLanguage]);
    const group = groups.get(key);
    if (group) group.push(section);
    else groups.set(key, [section]);
  }
  const services: SavedService[] = [...groups.values()].map((sections, serviceOrder) => {
    const item = sections[0].items[0];
    const query = item.queryWordInfo;
    return {
      type: item.queryType,
      serviceId: sections[0].serviceId ?? item.serviceId ?? item.queryType,
      serviceLabel: item.serviceLabel ?? item.queryType,
      serviceIcon: item.serviceIcon,
      serviceOrder,
      content: {
        kind: "legacy",
        role: sections.every((section) => section.items.every((item) => item.displayType === undefined))
          ? "translation"
          : "dictionary",
        query,
        sections: sections.map((section) => ({
          kind: sectionKind(section),
          title: section.sectionTitle,
          rows: section.items.map((item) => convertRow(item, query)),
        })),
      },
    };
  });
  return {
    query: {
      word: favorite.word,
      fromLanguage: favorite.fromLanguage,
      toLanguage: favorite.toLanguage,
      isWord: favorite.isWord,
      phonetic:
        favorite.phonetic ??
        favorite.displaySections.flatMap((section) => section.items).find((item) => item.accessoryItem?.phonetic)
          ?.accessoryItem?.phonetic,
      speechUrl: favorite.displaySections[0]?.items[0]?.queryWordInfo.speechUrl,
    },
    services,
    createdAt: favorite.createdAt,
    legacyPreview: legacyPreview(favorite),
  };
}
