/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { AIDictionarySense, AIWordResult } from "@/ai-providers/dictionary/types";
import { DictionaryType } from "@/types/api";
import type { DisplaySection, ListAccessoryItem, ListDisplayItem } from "@/types/display";
import type { QueryInput, QueryWordInfo } from "@/types/query";

import { AIDictionaryListItemType } from "./types";

/**
 * Derive the resolved `QueryWordInfo` for an AI dictionary result: it is a word
 * only when the model returned a structured entry, and its phonetic comes from
 * that entry's pronunciation.
 */
export function resolveAIDictionaryWordInfo(queryWordInfo: QueryInput, result: AIWordResult): QueryWordInfo {
  return {
    ...queryWordInfo,
    isWord: result.entry !== null,
    phonetic: result.entry?.pronunciation,
  };
}

export function formatAIWordResult(queryWordInfo: QueryInput, result: AIWordResult): DisplaySection[] {
  const resolvedWordInfo = resolveAIDictionaryWordInfo(queryWordInfo, result);
  const sections: DisplaySection[] = [
    {
      type: AIDictionaryListItemType.Translation,
      items: [
        createDisplayItem(AIDictionaryListItemType.Translation, resolvedWordInfo, {
          key: `translation:${result.translation}`,
          title: result.translation,
          subtitle: result.entry?.headword ?? queryWordInfo.word,
          copyText: result.translation,
          accessoryItem: { phonetic: result.entry?.pronunciation },
        }),
      ],
    },
  ];

  if (!result.entry) return sections;

  const definitionItems = result.entry.senses.map((sense, index) =>
    createSenseDisplayItem(resolvedWordInfo, sense, index),
  );
  if (definitionItems.length > 0) {
    sections.push({
      type: AIDictionaryListItemType.Definition,
      sectionTitle: "Definitions",
      items: definitionItems,
    });
  }

  const formItems = result.entry.forms.map((form, index) => {
    const text = `${form.label}: ${form.value}`;
    return createDisplayItem(AIDictionaryListItemType.Forms, resolvedWordInfo, {
      key: `form:${index}:${text}`,
      title: form.label,
      subtitle: form.value,
      copyText: text,
      detailsMarkdown: text,
    });
  });
  if (formItems.length > 0) {
    sections.push({
      type: AIDictionaryListItemType.Forms,
      sectionTitle: "Forms",
      items: formItems,
    });
  }

  return sections;
}

function createSenseDisplayItem(
  queryWordInfo: QueryWordInfo,
  sense: AIDictionarySense,
  index: number,
): ListDisplayItem {
  const partOfSpeech = sense.partOfSpeech ? `[${sense.partOfSpeech}] ` : "";
  const meanings = sense.meanings.join("; ");
  const title = `${partOfSpeech}${meanings}`;
  const copyText = [title, sense.definition, ...sense.examples.map(formatExampleText)].filter(Boolean).join("\n");
  const detailsMarkdown = [
    `### ${title}`,
    sense.definition,
    sense.examples.length > 0
      ? `**Examples**\n${sense.examples
          .map((example) => `- ${example.sentence}${example.translation ? `\n  ${example.translation}` : ""}`)
          .join("\n")}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return createDisplayItem(AIDictionaryListItemType.Definition, queryWordInfo, {
    key: `definition:${index}:${title}`,
    title,
    subtitle: sense.definition ?? sense.examples[0]?.sentence,
    copyText,
    detailsMarkdown,
  });
}

function formatExampleText(example: AIDictionarySense["examples"][number]): string {
  return example.translation ? `${example.sentence} — ${example.translation}` : example.sentence;
}

function createDisplayItem(
  displayType: AIDictionaryListItemType,
  queryWordInfo: QueryWordInfo,
  item: {
    key: string;
    title: string;
    subtitle?: string;
    copyText: string;
    detailsMarkdown?: string;
    accessoryItem?: ListAccessoryItem;
  },
): ListDisplayItem {
  return {
    ...item,
    queryType: DictionaryType.AI,
    displayType,
    queryWordInfo,
    tooltip: `AI-Generated ${displayType}`,
  };
}
