/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { lookupLanguageItem } from "@/core/language/utils";
import { DictionaryType } from "@/core/results/kinds";
import type { QueryWordInfo } from "@/core/results/types";

import type { ComposedContent } from "./compose";
import { plainText } from "./markdown";
import { renderDictionaryBody, viewRowLabel } from "./render";
import type { ContentEquivalent, ContentExample, DictionarySection, PrimarySupplement } from "./types";
import type { ViewRow, ViewSection, ViewService } from "./viewTypes";

/** Derive list fields without constructing any row body or translation comparison. */
export function buildContentView(composed: ComposedContent, flagsAreNotLanguages: boolean): ViewSection[] {
  const sections: ViewSection[] = [];
  let previousTranslation = false;
  for (const result of composed.services) {
    const { content, serviceId, serviceLabel, serviceIcon, fromCache, type } = result;
    const service: ViewService = {
      type,
      serviceId,
      serviceLabel,
      serviceIcon,
      fromCache,
      query: content.query,
      kind: content.kind,
    };
    const direction = languageTitle(content.query, composed.isShowDetail, flagsAreNotLanguages);
    if (content.kind === "translation") {
      const copyText = content.paragraphs.join("\n");
      sections.push({
        kind: "translation",
        service,
        title: previousTranslation ? serviceLabel : `${serviceLabel}   (${direction})`,
        items: [
          { kind: "translation", title: content.paragraphs.join(", "), copyText, service, renderBody: () => copyText },
        ],
      });
      previousTranslation = true;
      continue;
    }
    for (const [index, section] of content.sections.entries()) {
      const view = dictionarySection(service, section, index === 0 ? result.primarySupplement : undefined);
      sections.push({
        ...view,
        title:
          index === 0
            ? `${serviceLabel}   (${direction})`
            : type === DictionaryType.Youdao && index === 1
              ? "Details"
              : view.title,
      });
      previousTranslation = false;
    }
  }
  return sections;
}

type RowFields = Omit<ViewRow, "service" | "renderBody" | "tooltip">;

function dictionarySection(
  service: ViewService,
  section: DictionarySection,
  supplement?: PrimarySupplement,
): ViewSection {
  const items: ViewRow[] = [];
  let title: string | undefined;
  const add = (fields: RowFields, fallbackBody: () => string = () => fields.copyText) => {
    const primary = items.length === 0 ? supplement : undefined;
    if (primary?.translation) {
      const translation = primary.translation;
      fields = { ...fields, title: translation, copyText: translation };
      fallbackBody = () =>
        fields.subtitle
          ? fields.subtitle.startsWith(translation)
            ? fields.subtitle
            : `${translation} ${fields.subtitle}`
          : translation;
    }
    if (primary?.phonetic || primary?.examTypes?.length) {
      fields = {
        ...fields,
        accessory: { ...fields.accessory, phonetic: primary.phonetic, examTypes: primary.examTypes },
      };
    }
    const label = viewRowLabel({ ...fields, service });
    const row: ViewRow = {
      ...fields,
      service,
      tooltip: service.type === DictionaryType.AI ? `AI-Generated ${label}` : label,
      renderBody: () => renderDictionaryBody(row, fallbackBody),
    };
    items.push(row);
  };

  switch (section.kind) {
    case "translation": {
      const text = service.type === DictionaryType.Youdao ? section.text.split("\n").join(", ") : section.text;
      const subtitle =
        service.type === DictionaryType.Youdao
          ? service.query.word.split("\n").join(" ")
          : (section.lemma ?? service.query.word);
      add({
        kind: "translation",
        title: text,
        subtitle,
        copyText: service.type === DictionaryType.Linguee ? `${text} ${subtitle}` : text,
        accessory:
          service.type === DictionaryType.Linguee
            ? undefined
            : {
                phonetic: service.query.phonetic || section.pronunciation,
                examTypes: service.type === DictionaryType.Youdao ? service.query.examTypes : undefined,
              },
      });
      title = service.type === DictionaryType.AI ? undefined : service.type;
      break;
    }
    case "equivalents": {
      const { word, qualifier = "", partOfSpeech = "" } = section.headword;
      title = `${word}${qualifier ? ` ${qualifier}` : ""}${partOfSpeech ? (qualifier.endsWith(".") ? `  ${partOfSpeech}` : `.${partOfSpeech}`) : ""}`;
      const unfeatured: ContentEquivalent[] = [];
      for (const entry of section.entries) {
        if (!entry.prominent) {
          unfeatured.push(entry);
          continue;
        }
        const note = entry.frequency === "common" ? "" : `  ${entry.inflectionNote ?? ""}`;
        const example = entry.firstExampleTranslation ?? "";
        const pos = entry.partOfSpeech ? `${entry.partOfSpeech}${note || example ? "." : ""}` : "";
        const subtitle = `${pos}${note}       ${example}`;
        add({
          kind: "equivalent",
          title: entry.text,
          subtitle,
          copyText: `${entry.text} ${subtitle}`,
          frequency: entry.frequency,
          prominent: true,
        });
      }
      const last = unfeatured.at(-1);
      if (last) {
        const text = last.partOfSpeech ? `${last.partOfSpeech}.` : "";
        const subtitle = `${unfeatured.map((entry) => entry.text).join(";  ")}  ${last.frequency === "less-common" ? "(less common)" : ""}`;
        add({
          kind: "equivalent",
          title: text,
          subtitle,
          copyText: `${text} ${subtitle}`,
          frequency: last.frequency,
          prominent: false,
        });
      }
      break;
    }
    case "definitions": {
      title = service.type === DictionaryType.AI ? "Definitions" : undefined;
      for (const entry of section.entries) {
        if (entry.kind === "plain") {
          const subtitle = entry.note ? ` ${entry.note}` : "";
          add({ kind: "definition", title: entry.text, subtitle, copyText: `${entry.text}${subtitle}` }, () =>
            youdaoBody(entry.text, subtitle),
          );
        } else {
          const text = `${entry.partOfSpeech ? `[${entry.partOfSpeech}] ` : ""}${entry.meanings.join("; ")}`;
          add(
            {
              kind: "definition",
              title: text,
              subtitle: entry.explanation ?? entry.examples[0]?.sentence,
              copyText: [text, entry.explanation, ...entry.examples.map(exampleText)].filter(Boolean).join("\n"),
            },
            () =>
              [
                `**${plainText(text)}**`,
                entry.explanation ? plainText(entry.explanation) : undefined,
                entry.examples.length
                  ? entry.examples
                      .map(
                        (example) =>
                          `- **${plainText(example.sentence)}**${example.translation ? `  \n  ${plainText(example.translation)}` : ""}`,
                      )
                      .join("\n\n")
                  : undefined,
              ]
                .filter(Boolean)
                .join("\n\n"),
          );
        }
      }
      break;
    }
    case "pairs": {
      title =
        service.type === DictionaryType.AI
          ? "Forms"
          : service.type === DictionaryType.Linguee
            ? "Related words:"
            : undefined;
      for (const entry of section.entries) {
        const subtitle =
          service.type === DictionaryType.Linguee
            ? `${entry.partOfSpeech ? `${entry.partOfSpeech}.  ` : ""}${entry.meaning}`
            : entry.meaning;
        const copyText =
          service.type === DictionaryType.AI
            ? `${entry.expression}: ${entry.meaning}`
            : `${entry.expression} ${subtitle}`;
        add({ kind: section.relation, title: entry.expression, subtitle, copyText }, () =>
          service.type === DictionaryType.Youdao ? youdaoBody(entry.expression, subtitle) : copyText,
        );
      }
      break;
    }
    case "form-set": {
      const copyText = section.forms.map((form) => `${form.label}: ${form.value}`).join("   ");
      if (copyText)
        add({ kind: "form-set", title: "", subtitle: ` [ ${copyText} ]`, copyText }, () => ` [ ${copyText} ]`);
      break;
    }
    case "examples": {
      title = "Examples:";
      for (const entry of section.entries) {
        const subtitle = `${entry.partOfSpeech ? `${entry.partOfSpeech}.  ` : ""}—  ${entry.translation ?? ""}`;
        add({ kind: "example", title: entry.sentence, subtitle, copyText: `${entry.sentence} ${subtitle}` });
      }
      break;
    }
    case "summary": {
      title = service.type === DictionaryType.Linguee ? "Wikipedia" : undefined;
      for (const entry of section.entries) {
        const text = service.type === DictionaryType.Linguee ? `${entry.subject} ${entry.text}` : entry.subject;
        const subtitle = service.type === DictionaryType.Linguee ? "" : entry.text;
        add(
          { kind: "summary", title: text, subtitle, copyText: `${text} ${subtitle}`, summarySource: section.source },
          () =>
            service.type === DictionaryType.Youdao ? youdaoBody(entry.subject, entry.text) : `${text} ${subtitle}`,
        );
      }
      break;
    }
    case "chinese-entry": {
      for (const entry of section.entries)
        add(
          {
            kind: "chinese-entry",
            title: entry.pronunciation ?? "",
            subtitle: entry.summary,
            copyText: `${entry.pronunciation ?? ""}  ${entry.summary}`,
          },
          () => entry.markdown,
        );
      break;
    }
  }
  return { kind: section.kind, service, title, items };
}

function youdaoBody(title: string, subtitle?: string): string {
  if (!subtitle || subtitle.startsWith(title)) return subtitle || title;
  return subtitle.match(/"(.*?)"/)?.[1] === title ? subtitle : `${title} ${subtitle}`;
}

function exampleText(example: ContentExample): string {
  return example.translation ? `${example.sentence} — ${example.translation}` : example.sentence;
}

function languageTitle(info: QueryWordInfo, onlyEmoji: boolean, flagsAreNotLanguages: boolean): string {
  const from = lookupLanguageItem(info.fromLanguage);
  const to = lookupLanguageItem(info.toLanguage);
  const fromName = from?.langEnglishName ?? info.fromLanguage;
  const toName = to?.langEnglishName ?? info.toLanguage;
  const fromEmoji = from?.emoji ?? "🌐";
  const toEmoji = to?.emoji ?? "🌐";
  if (flagsAreNotLanguages) return `${fromName} --> ${toName}`;
  return onlyEmoji ? `${fromEmoji} --> ${toEmoji}` : `${fromName}${fromEmoji} --> ${toName}${toEmoji}`;
}
