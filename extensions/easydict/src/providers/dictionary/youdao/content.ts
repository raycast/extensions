/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryContent, DictionarySection } from "@/core/content/types";
import type { QueryWordInfo } from "@/core/results/types";

import type { ChineseSense, ModernChineseEntry, YoudaoDictionaryData } from "./types";

export function buildYoudaoContent(query: QueryWordInfo, data: YoudaoDictionaryData): DictionaryContent {
  const sections: DictionarySection[] = [];
  const chineseEntries = data.modernChineseDict.filter((entry) => entry.senses.length).map(buildChineseEntry);
  if (chineseEntries.length) sections.push({ kind: "chinese-entry", entries: chineseEntries });
  if (data.explanations.length) {
    sections.push({ kind: "definitions", entries: data.explanations.map((entry) => ({ kind: "plain", ...entry })) });
  }
  if (data.forms.length) sections.push({ kind: "form-set", forms: data.forms });

  const word = data.word ?? query.word;
  const firstWebEntry = data.webEntries[0];
  const hasWebTranslation = firstWebEntry?.key.toUpperCase() === word.toUpperCase();
  const phrases = data.webEntries.slice(hasWebTranslation ? 1 : 0, hasWebTranslation ? 4 : 3);
  if (
    !sections.length &&
    !(hasWebTranslation && firstWebEntry.key && firstWebEntry.values.length) &&
    !phrases.some((entry) => entry.key && entry.values.length) &&
    !data.baike &&
    !data.wikipedia
  )
    return { kind: "dictionary", query, sections };

  if (hasWebTranslation) {
    sections.push({
      kind: "pairs",
      relation: "web-translation",
      entries: [{ expression: firstWebEntry.key, meaning: firstWebEntry.values.join("；") }],
    });
  }
  if (phrases.length) {
    sections.push({
      kind: "pairs",
      relation: "phrase",
      entries: phrases.map((entry) => ({ expression: entry.key, meaning: entry.values.join("；") })),
    });
  }
  if (data.baike) sections.push({ kind: "summary", source: "encyclopedia", entries: [data.baike] });
  if (data.wikipedia) sections.push({ kind: "summary", source: "wikipedia", entries: [data.wikipedia] });

  const phonetic = data.phonetic ? `/${data.phonetic}/` : query.phonetic;
  const languagePair =
    query.fromLanguage === "auto" && data.language
      ? data.guessedChinese
        ? { fromLanguage: "zh-CHS", toLanguage: data.language }
        : { fromLanguage: data.language, toLanguage: "zh-CHS" }
      : { fromLanguage: query.fromLanguage, toLanguage: query.toLanguage };
  const pronunciation = data.modernChineseDict.find((entry) => entry.pronunciation)?.pronunciation;
  sections.unshift({
    kind: "translation",
    text: hasWebTranslation ? (firstWebEntry.values[0]?.split("; ")[0] ?? "") : "",
    pronunciation: !phonetic && pronunciation ? `/${pronunciation}/` : undefined,
  });
  return {
    kind: "dictionary",
    query: {
      word,
      ...languagePair,
      phonetic,
      examTypes: data.examTypes,
      speechUrl: data.speechUrl,
      isWord: data.isWord,
    },
    sections,
  };
}

function buildChineseEntry(entry: ModernChineseEntry) {
  const groups: ChineseSense[][] = [];
  for (const sense of entry.senses) {
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup[0].category === sense.category) lastGroup.push(sense);
    else groups.push([sense]);
  }

  let markdown = entry.pronunciation ?? "";
  let summary = "";
  for (const group of groups) {
    const first = group[0];
    const category = first.category ? `${first.category} ` : first.definition ? "~" : "";
    const definitions = buildSenseMarkdown(group);
    markdown += `\n\n${category}${definitions}`;
    summary += category + definitions.replace(/\n/g, " ").replace(/`/g, "");
  }
  return { pronunciation: entry.pronunciation, summary, markdown };
}

function buildSenseMarkdown(senses: ChineseSense[], prefix = "\n\n", parent?: number): string {
  return senses
    .map((sense, index) => {
      let markdown = prefix + (parent ? `${parent}.` : "");
      const text = Array.isArray(sense.definition) ? sense.definition.join("; ") : sense.definition;
      const definition = text ? ` ${text}` : sense.subsenses.length ? " ~" : "";
      const examples = sense.examples.map((text) => `\`${text}\``).join("/");
      if (definition || examples) markdown += `${index + 1}.${definition}${examples ? `：${examples}  ` : ""}`;
      if (sense.subsenses.length) markdown += "  " + buildSenseMarkdown(sense.subsenses, "\n", index + 1);
      return markdown;
    })
    .join("");
}
