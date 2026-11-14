/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { decodeProviderContent } from "@/core/content/decode";
import type { PrimarySupplement } from "@/core/content/types";
import { decodeIcon } from "@/core/results/decode";
import {
  array,
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

import { convertLegacyFavorite, type LegacySavedContent, type LegacySavedRow } from "./legacy";
import { decodeDisplaySections } from "./legacyDisplay";
import type { FavoriteWord, SavedService } from "./model";

export function decodeFavoriteSnapshot(value: unknown): FavoriteWord {
  const source = record(value, "favorite");
  return {
    query: decodeQueryWordInfo(source.query, "favorite.query"),
    services: array(source.services, decodeService, "favorite.services"),
    createdAt: finiteNumber(source.createdAt, "favorite.createdAt"),
    legacyPreview: optional(source.legacyPreview, strings, "favorite.legacyPreview"),
  };
}

export function decodeLegacyFavorites(value: unknown): FavoriteWord[] {
  return array(
    value,
    (value, path) => {
      const source = record(value, path);
      return convertLegacyFavorite({
        word: text(source.word, `${path}.word`),
        fromLanguage: text(source.fromLanguage, `${path}.fromLanguage`),
        toLanguage: text(source.toLanguage, `${path}.toLanguage`),
        isWord: optional(source.isWord, boolean, `${path}.isWord`),
        phonetic: optional(source.phonetic, text, `${path}.phonetic`),
        createdAt: finiteNumber(source.createdAt, `${path}.createdAt`),
        translations: optional(source.translations, strings, `${path}.translations`),
        displaySections: decodeDisplaySections(source.displaySections),
      });
    },
    "favorites",
  );
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid(path);
  return value;
}

function decodeService(value: unknown, path: string): SavedService {
  const source = record(value, path);
  const metadata = {
    serviceId: text(source.serviceId, `${path}.serviceId`),
    serviceLabel: text(source.serviceLabel, `${path}.serviceLabel`),
    serviceOrder: finiteNumber(source.serviceOrder, `${path}.serviceOrder`),
    serviceIcon: optional(source.serviceIcon, decodeIcon, `${path}.serviceIcon`),
    primarySupplement: optional(source.primarySupplement, decodeSupplement, `${path}.primarySupplement`),
  };
  const valueContent = record(source.content, `${path}.content`);
  if (valueContent.kind === "legacy") {
    return {
      ...metadata,
      type: member(source.type, [...Object.values(TranslationType), ...Object.values(DictionaryType)], `${path}.type`),
      content: decodeLegacyContent(valueContent, `${path}.content`),
    };
  }
  const content = decodeProviderContent(valueContent);
  return content.kind === "translation"
    ? { ...metadata, type: member(source.type, Object.values(TranslationType), `${path}.type`), content }
    : { ...metadata, type: member(source.type, Object.values(DictionaryType), `${path}.type`), content };
}

function decodeSupplement(value: unknown, path: string): PrimarySupplement {
  const source = record(value, path);
  return {
    translation: optional(source.translation, text, `${path}.translation`),
    phonetic: optional(source.phonetic, text, `${path}.phonetic`),
    examTypes: optional(source.examTypes, strings, `${path}.examTypes`),
  };
}

function decodeLegacyContent(source: Record<string, unknown>, path: string): LegacySavedContent {
  return {
    kind: "legacy",
    role: member(source.role, ["translation", "dictionary"], `${path}.role`),
    query: decodeQueryWordInfo(source.query, `${path}.query`),
    sections: array(
      source.sections,
      (value, path) => {
        const section = record(value, path);
        return {
          kind: member(
            section.kind,
            ["translation", "equivalents", "definitions", "pairs", "form-set", "examples", "summary", "chinese-entry"],
            `${path}.kind`,
          ),
          title: optional(section.title, text, `${path}.title`),
          rows: array(section.rows, decodeLegacyRow, `${path}.rows`),
        };
      },
      `${path}.sections`,
    ),
  };
}

function decodeLegacyRow(value: unknown, path: string): LegacySavedRow {
  const source = record(value, path);
  return {
    kind: member(
      source.kind,
      [
        "translation",
        "definition",
        "equivalent",
        "form",
        "phrase",
        "related",
        "web-translation",
        "form-set",
        "example",
        "summary",
        "chinese-entry",
      ],
      `${path}.kind`,
    ),
    title: text(source.title, `${path}.title`),
    subtitle: optional(source.subtitle, text, `${path}.subtitle`),
    copyText: text(source.copyText, `${path}.copyText`),
    bodyStyle: optional(source.bodyStyle, (value, path) => member(value, ["raw-text"], path), `${path}.bodyStyle`),
    bodyMarkdown: optional(source.bodyMarkdown, text, `${path}.bodyMarkdown`),
    phonetic: optional(source.phonetic, text, `${path}.phonetic`),
    query: optional(source.query, decodeQueryWordInfo, `${path}.query`),
    frequency: optional(
      source.frequency,
      (value, path) => member(value, ["common", "often", "almost-always", "less-common", "special-forms"], path),
      `${path}.frequency`,
    ),
    prominent: optional(source.prominent, boolean, `${path}.prominent`),
    summarySource: optional(
      source.summarySource,
      (value, path) => member(value, ["encyclopedia", "wikipedia"], path),
      `${path}.summarySource`,
    ),
  };
}
