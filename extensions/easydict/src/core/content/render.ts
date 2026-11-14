/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLanguageEnglishName } from "@/core/language/utils";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import { escapeHtml, plainText } from "./markdown";
import type { ViewRow, ViewSection, ViewService } from "./viewTypes";

function languageDirection(info: QueryWordInfo): string {
  return `${getLanguageEnglishName(info.fromLanguage)} → ${getLanguageEnglishName(info.toLanguage)}`;
}

/**
 * Mathematical bold alphanumerics render as a Times-like serif through the
 * system math font (STIX Two Math on macOS, Cambria Math on Windows), so the
 * headword needs no image and wraps naturally. Non-ASCII words keep the native
 * heading instead.
 */
function toMathBold(text: string): string {
  return Array.from(text)
    .map((character) => {
      const code = character.codePointAt(0)!;
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + code - 48);
      return character;
    })
    .join("");
}

function canUseMathBold(word: string): boolean {
  return /^[\x20-\x7e]+$/.test(word) && /[A-Za-z0-9]/.test(word);
}

/** Conservative width bound for the KaTeX pronunciation; over-estimating only falls back to plain text. */
function estimateTextWidth(text: string, fontSize: number): number {
  const widthAt32 = Array.from(text).reduce((width, character) => {
    if (character.codePointAt(0)! > 127) return width + 48;
    if (/[mwMW@%]/.test(character)) return width + 40;
    if (/[il|.,'`:;!]/.test(character)) return width + 14;
    return width + (/[A-Z0-9]/.test(character) ? 32 : 26);
  }, 0);
  return Math.ceil((widthAt32 * fontSize) / 32);
}

/** KaTeX treats these as control sequences; such pronunciations stay plain text instead. */
const MATH_UNSUPPORTED = /[\\{}$&#_%^~]/;

/** KaTeX cannot wrap; wider pronunciations fall back to plain text. The estimate over-states the bundled KaTeX font, so this budget still fits one line. */
const PHONETIC_LINE_BUDGET = 800;

/**
 * Standalone pages own the direction line; saved favorites show the language
 * pair in the list, so their details omit it to avoid repeating the same data.
 */
function resultHeader(info: QueryWordInfo, showDirection = true): string {
  const source = plainText(info.word);
  const word = info.isWord === true && !info.word.includes("\n");
  const direction = showDirection ? plainText(languageDirection(info)) : "";
  if (word) {
    const phonetic = info.phonetic ?? "";
    if (canUseMathBold(info.word)) {
      const katexPhonetic =
        phonetic && !MATH_UNSUPPORTED.test(phonetic) && estimateTextWidth(phonetic, 20) + 8 <= PHONETIC_LINE_BUDGET
          ? phonetic
          : "";
      const pronunciation = katexPhonetic ? ` \\({\\small\\textcolor{gray}{\\text{${katexPhonetic}}}}\\)` : "";
      return [
        `## ${plainText(toMathBold(info.word))}${pronunciation}`,
        !katexPhonetic && plainText(phonetic),
        direction,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    return [`## ${source}${phonetic ? ` · ${plainText(phonetic)}` : ""}`, direction].filter(Boolean).join("\n\n");
  }
  const quote = source
    .split("\n")
    .map((line) => `> ${line}  `)
    .join("\n");
  return [direction, quote].filter(Boolean).join("\n\n");
}

interface TranslationEntry {
  label: string;
  text: string;
  info: QueryWordInfo;
}

function translationBody(info: QueryWordInfo, results: readonly TranslationEntry[]): string {
  const entries = results
    .filter((result) => result.text.trim())
    .map((result) => ({
      ...result,
      label:
        result.label +
        (result.info.fromLanguage !== info.fromLanguage || result.info.toLanguage !== info.toLanguage
          ? ` · ${languageDirection(result.info)}`
          : ""),
    }));
  const compact =
    info.isWord === true &&
    entries.length > 1 &&
    entries.every((entry) => entry.text.length <= 120 && !entry.text.includes("\n"));
  return compact
    ? table(
        entries.map((entry) => [entry.label, entry.text]),
        ["Service", "Translation"],
      )
    : entries.map((entry) => `**${plainText(entry.label)}**\n\n${entry.text}`).join("\n\n");
}

export function viewRowLabel(
  row: Pick<ViewRow, "kind" | "frequency" | "prominent" | "summarySource" | "service">,
): string {
  switch (row.kind) {
    case "translation":
      return "Translation";
    case "definition":
      return row.service.type === DictionaryType.Youdao ? "Explanation" : "Definition";
    case "equivalent": {
      if (!row.prominent) return row.frequency === "less-common" ? "Less Common" : "Unfeatured";
      switch (row.frequency) {
        case "often":
          return "Often Used";
        case "almost-always":
          return "Almost Always Used";
        case "less-common":
          return "Less Common";
        case "special-forms":
          return "Forms";
        default:
          return "Common";
      }
    }
    case "form":
      return "Forms";
    case "phrase":
      return "Web Phrase";
    case "related":
      return "Related word";
    case "web-translation":
      return "Web Translation";
    case "form-set":
      return "Forms and Tenses";
    case "example":
      return "Example";
    case "summary":
      return row.summarySource === "encyclopedia"
        ? "Baike"
        : row.summarySource === "wikipedia"
          ? "Wikipedia"
          : "Summary";
    case "chinese-entry":
      return "Modern Chinese Dict";
  }
}

function table(rows: readonly (readonly string[])[], headings?: readonly string[]): string {
  const header = headings
    ? `<thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>\n`
    : "";
  return `<table>\n${header}${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`)
    .join("\n")}\n</table>`;
}

function isPairedRow(row: ViewRow): boolean {
  return (
    (row.kind === "form" ||
      row.kind === "phrase" ||
      row.kind === "related" ||
      (row.kind === "equivalent" && row.frequency === "special-forms" && row.prominent === true)) &&
    Boolean(row.title && row.subtitle) &&
    row.title.length <= 80 &&
    (row.subtitle?.length ?? 0) <= 120
  );
}

/** Shared row semantics for fresh content and independently decoded saved content. */
export function renderDictionaryBody(row: ViewRow, fallbackBody: () => string): string {
  if (row.kind === "translation")
    return row.service.query.isWord ? `**${plainText(row.title)}**` : plainText(row.title);
  if (isPairedRow(row)) return table([[row.title, row.subtitle ?? ""]]);
  if (row.kind === "example")
    return `- **${plainText(row.title)}**${row.subtitle ? `  \n  ${plainText(row.subtitle)}` : ""}`;
  return fallbackBody();
}

interface ServiceSections {
  service: ViewService;
  sections: ViewSection[];
}

function groupSections(sections: readonly ViewSection[]): ServiceSections[] {
  const groups = new Map<string, ServiceSections>();
  for (const section of sections) {
    if (!section.items.length) continue;
    const { service } = section;
    const key = JSON.stringify([service.serviceId, service.query.fromLanguage, service.query.toLanguage]);
    const group = groups.get(key);
    if (group) group.sections.push(section);
    else groups.set(key, { service, sections: [section] });
  }
  return [...groups.values()];
}

function translationEntry(group: ServiceSections): TranslationEntry {
  return {
    label: group.service.serviceLabel,
    text: group.sections.flatMap((section) => section.items.map((row) => row.copyText)).join("\n\n"),
    info: group.service.query,
  };
}

/** Only the selected translation constructs its comparison; dictionary rows render their own body. */
export function renderSelectedRow(row: ViewRow, sections: readonly ViewSection[]): string {
  if (row.service.kind === "dictionary") return row.renderBody();
  const groups = groupSections(sections).filter((group) => group.service.kind === "translation");
  const current = groups.findIndex((group) => group.service.serviceId === row.service.serviceId);
  if (current > 0) groups.unshift(...groups.splice(current, 1));
  return translationBody(row.service.query, groups.map(translationEntry));
}

export function renderStandaloneRow(row: ViewRow): string {
  return [
    resultHeader({ ...row.service.query, phonetic: row.accessory?.phonetic ?? row.service.query.phonetic }),
    `<small>${escapeHtml(row.service.serviceLabel)}</small>`,
    row.renderBody(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sectionBody(section: ViewSection): string {
  if (section.items.length > 0 && section.items.every(isPairedRow)) {
    const forms = section.items.every((row) => row.kind === "form" || row.frequency === "special-forms");
    return table(
      section.items.map((row) => [row.title, row.subtitle ?? ""]),
      forms ? ["Form", "Value"] : ["Expression", "Meaning"],
    );
  }
  if (section.kind === "definitions")
    return section.items.map((row, index) => `<small>${index + 1}.</small> ${row.renderBody()}`).join("\n\n");
  return section.items
    .map((row) => row.renderBody())
    .filter(Boolean)
    .join("\n\n");
}

/** Saved pages reuse row bodies and group adjacent translations without changing service order. */
export function renderSavedView(query: QueryWordInfo, sections: readonly ViewSection[]): string {
  const headerPhonetic =
    query.phonetic ??
    sections.flatMap((section) => section.items).find((row) => row.accessory?.phonetic)?.accessory?.phonetic;
  const content: string[] = [];
  let pendingTranslations: TranslationEntry[] = [];
  const flushTranslations = () => {
    if (pendingTranslations.length) content.push(translationBody(query, pendingTranslations));
    pendingTranslations = [];
  };
  for (const group of groupSections(sections)) {
    if (group.service.kind === "translation") {
      pendingTranslations.push(translationEntry(group));
      continue;
    }
    flushTranslations();
    const info = group.service.query;
    const direction =
      info.fromLanguage !== query.fromLanguage || info.toLanguage !== query.toLanguage
        ? ` · ${languageDirection(info)}`
        : "";
    const phonetic = group.sections.flatMap((section) => section.items).find((row) => row.accessory?.phonetic)
      ?.accessory?.phonetic;
    const body = group.sections
      .map((section, index) => {
        const body = sectionBody(section);
        if (!body) return "";
        const first = section.items[0];
        if (!first || first.kind === "translation" || first.kind === "definition") return body;
        const title = index > 0 && section.title && section.title !== "Details" ? section.title : viewRowLabel(first);
        return `<small><strong>${escapeHtml(title)}</strong></small>\n\n${body}`;
      })
      .filter(Boolean)
      .join("\n\n");
    content.push(
      [
        `<small>${escapeHtml(group.service.serviceLabel + direction)}${phonetic && phonetic !== headerPhonetic ? ` · ${escapeHtml(phonetic)}` : ""}</small>`,
        body,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  flushTranslations();
  return [resultHeader({ ...query, phonetic: headerPhonetic }, false), content.join("\n\n---\n\n")]
    .filter(Boolean)
    .join("\n\n");
}
