/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getLanguageItem } from "@/core/language/utils";
import type { DisplaySection, ListDisplayItem } from "@/types/display";
import type { QueryWordInfo } from "@/types/query";
import { isDarkAppearance } from "@/utils/appearance";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function plainText(text: string): string {
  return escapeHtml(text).replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1");
}

export function languageDirection(info: QueryWordInfo): string {
  return `${getLanguageItem(info.fromLanguage).langEnglishName} → ${getLanguageItem(info.toLanguage).langEnglishName}`;
}

export function resultHeader(info: QueryWordInfo): string {
  const source = plainText(info.word);
  const word = info.isWord === true && !info.word.includes("\n");
  const direction = languageDirection(info);
  if (word) {
    // One SVG establishes a shared baseline; Raycast ignores CSS float in markdown.
    // Long headwords keep native wrapping instead of shrinking or clipping their text.
    const estimatedWidth = Array.from(info.word).reduce(
      (width, character) => width + (character.codePointAt(0)! > 127 || /[MW@%]/.test(character) ? 28 : 18),
      0,
    );
    const directionWidth = Array.from(direction).reduce(
      (width, character) => width + (character.codePointAt(0)! > 127 ? 16 : 10),
      0,
    );
    const phonetic = info.phonetic ?? "";
    const phoneticWidth = Array.from(phonetic).length * 12;
    if (estimatedWidth + phoneticWidth + directionWidth + 48 <= 600) {
      const dark = isDarkAppearance();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="44" viewBox="0 0 600 44"><text x="0" y="30" font-family="Georgia, Times New Roman, serif" font-size="32" font-weight="700" fill="${dark ? "#f2f2f2" : "#202020"}">${escapeHtml(info.word)}</text>${phonetic ? `<text x="${estimatedWidth + 26}" y="30" font-family="Arial, sans-serif" font-size="20" fill="${dark ? "#aaaaaa" : "#777777"}">${escapeHtml(phonetic)}</text>` : ""}<text x="600" y="30" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="${dark ? "#aaaaaa" : "#666666"}">${escapeHtml(direction)}</text></svg>`;
      return `![${plainText(`${info.word}${phonetic ? ` · ${phonetic}` : ""} · ${direction}`)}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
    }
    return `## ${source}${phonetic ? ` · ${plainText(phonetic)}` : ""}\n\n${plainText(direction)}`;
  }
  return `${plainText(direction)}\n\n${source
    .split("\n")
    .map((line) => `> ${line}  `)
    .join("\n")}`;
}

function table(rows: string[][], headings?: string[]): string {
  const header = headings
    ? `<thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>\n`
    : "";
  return `<table>\n${header}${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`).join("\n")}\n</table>`;
}

function isPairedItem(item: ListDisplayItem): boolean {
  return (
    ["Forms", "Web Phrase", "Related word"].includes(item.displayType ?? "") &&
    Boolean(item.title && item.subtitle) &&
    item.title.length <= 80 &&
    (item.subtitle?.length ?? 0) <= 120
  );
}

export interface TranslationContent {
  label: string;
  text: string;
  info: QueryWordInfo;
}

function translationBody(info: QueryWordInfo, results: TranslationContent[]): string {
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
  const body = compact
    ? table(
        entries.map((entry) => [entry.label, entry.text]),
        ["Service", "Translation"],
      )
    : entries.map((entry) => `**${plainText(entry.label)}**\n\n${entry.text}`).join("\n\n");
  return body;
}

export function translationResultsMarkdown(info: QueryWordInfo, results: TranslationContent[]): string {
  // The live query is already visible in the search field.
  return translationBody(info, results);
}

/** Body only: saved standalone pages and aggregate translation previews are not composable. */
export function resultItemBody(item: ListDisplayItem): string {
  if (!item.displayType) return item.copyText;
  if (item.displayType === "Translation") {
    return item.queryWordInfo.isWord ? `**${plainText(item.title)}**` : plainText(item.title);
  }
  if (isPairedItem(item)) return table([[item.title, item.subtitle ?? ""]]);
  if (item.displayType === "Example") {
    return `- **${plainText(item.title)}**${item.subtitle ? `  \n  ${plainText(item.subtitle)}` : ""}`;
  }
  // Older AI snapshots used a heading for each sense; preserve their body while reducing that heading.
  if (item.displayType === "Definition" && item.detailsMarkdown?.startsWith(`### ${item.title}\n`)) {
    return `**${plainText(item.title)}**${item.detailsMarkdown.slice(`### ${item.title}`.length)}`;
  }
  return item.detailsMarkdown ?? plainText(item.copyText || item.title);
}

export function standaloneResultMarkdown(item: ListDisplayItem): string {
  return [
    resultHeader({ ...item.queryWordInfo, phonetic: item.accessoryItem?.phonetic ?? item.queryWordInfo.phonetic }),
    `<small>${escapeHtml(item.serviceLabel ?? item.queryType)}</small>`,
    resultItemBody(item),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sectionBody(section: DisplaySection): string {
  // Only short, explicitly paired fields use tables. Long prose retains the full pane width.
  if (section.items.length > 0 && section.items.every(isPairedItem)) {
    return table(
      section.items.map((item) => [item.title, item.subtitle ?? ""]),
      section.type === "Forms" ? ["Form", "Value"] : ["Expression", "Meaning"],
    );
  }
  if (["Explanation", "Definition"].includes(section.type)) {
    return section.items.map((item, index) => `<small>${index + 1}.</small> ${resultItemBody(item)}`).join("\n\n");
  }
  return section.items.map(resultItemBody).filter(Boolean).join("\n\n");
}

/** Render saved sections using the same bodies as live results, without repeating page wrappers. */
export function savedResultMarkdown(info: QueryWordInfo, sections: readonly DisplaySection[]): string {
  const headerPhonetic =
    info.phonetic ??
    sections.flatMap((section) => section.items).find((item) => item.accessoryItem?.phonetic)?.accessoryItem?.phonetic;
  const groups = new Map<string, { label: string; info: QueryWordInfo; sections: DisplaySection[] }>();
  for (const section of sections) {
    const item = section.items[0];
    if (!item) continue;
    const identity = section.serviceId ?? item.serviceId ?? item.queryType;
    const key = JSON.stringify([identity, item.queryWordInfo.fromLanguage, item.queryWordInfo.toLanguage]);
    const group = groups.get(key);
    if (group) group.sections.push(section);
    else groups.set(key, { label: item.serviceLabel ?? item.queryType, info: item.queryWordInfo, sections: [section] });
  }
  const orderedGroups = [...groups.values()];
  const content: string[] = [];
  let pendingTranslations: TranslationContent[] = [];
  const flushTranslations = () => {
    if (pendingTranslations.length) content.push(translationBody(info, pendingTranslations));
    pendingTranslations = [];
  };
  for (const group of orderedGroups) {
    if (group.sections.every((section) => section.items.every((item) => !item.displayType))) {
      pendingTranslations.push({
        label: group.label,
        info: group.info,
        text: group.sections.flatMap((section) => section.items.map(resultItemBody)).join("\n\n"),
      });
      continue;
    }
    flushTranslations();
    const direction =
      group.info.fromLanguage !== info.fromLanguage || group.info.toLanguage !== info.toLanguage
        ? ` · ${languageDirection(group.info)}`
        : "";
    const phonetic = group.sections.flatMap((section) => section.items).find((item) => item.accessoryItem?.phonetic)
      ?.accessoryItem?.phonetic;
    const body = group.sections
      .map((section, index) => {
        const body = sectionBody(section);
        if (!body) return "";
        const type = section.items[0]?.displayType;
        if (!type || ["Translation", "Explanation", "Definition"].includes(type)) return body;
        const title =
          index > 0 && section.sectionTitle && section.sectionTitle !== "Details" ? section.sectionTitle : type;
        return `<small><strong>${escapeHtml(title)}</strong></small>\n\n${body}`;
      })
      .filter(Boolean)
      .join("\n\n");
    content.push(
      [
        `<small>${escapeHtml(group.label + direction)}${phonetic && phonetic !== headerPhonetic ? ` · ${escapeHtml(phonetic)}` : ""}</small>`,
        body,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  flushTranslations();
  return [resultHeader({ ...info, phonetic: headerPhonetic }), content.join("\n\n---\n\n")]
    .filter(Boolean)
    .join("\n\n");
}
