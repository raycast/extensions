/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { parseSourceLanguage } from "@/core/language/utils";

import type { ChineseSense, YoudaoDictionaryData, YoudaoSummary } from "./types";

export function decodeYoudaoResponse(value: unknown): YoudaoDictionaryData {
  const source = record(value);
  if (!source) throw new Error("Invalid Youdao dictionary response");

  const language = parseSourceLanguage(source.le);
  const data: YoudaoDictionaryData = {
    word: text(source.input),
    language: language === "auto" ? undefined : language,
    guessedChinese: record(source.meta)?.guessLanguage === "zh",
    isWord: false,
    explanations: [],
    forms: [],
    webEntries: array(record(source.web_trans)?.["web-translation"]).flatMap((item) => {
      const entry = record(item);
      const key = text(entry?.key);
      const translations = array(entry?.trans);
      if (key === undefined || !translations.length) return [];
      const values = translations.flatMap((value) => {
        const translation = text(record(value)?.value);
        return translation === undefined ? [] : [translation];
      });
      return [{ key, values }];
    }),
    modernChineseDict: array(record(source.newhh)?.dataList).flatMap((item) => {
      const entry = record(item);
      return entry ? [{ pronunciation: text(entry.pinyin), senses: decodeSenses(entry.sense) }] : [];
    }),
    baike: decodeSummary(source.baike),
    wikipedia: decodeSummary(source.wikipedia_digest),
  };

  const ec = record(source.ec);
  if (ec) {
    const word = record(array(ec.word)[0]);
    data.isWord = word !== undefined;
    data.phonetic = text(word?.usphone);
    const speech = text(word?.usspeech);
    data.speechUrl = speech ? `https://dict.youdao.com/dictvoice?audio=${speech}` : undefined;
    data.examTypes = Array.isArray(ec.exam_type) ? strings(ec.exam_type).slice(-6) : undefined;
    data.explanations = array(word?.trs).flatMap((item) => {
      const explanation = text(array(firstTranslation(item)?.i)[0]);
      return explanation ? [{ text: explanation, note: "" }] : [];
    });
    data.forms = array(word?.wfs).flatMap((item) => {
      const form = record(record(item)?.wf);
      const label = text(form?.name);
      const value = text(form?.value);
      return label && value ? [{ label, value }] : [];
    });
  }

  // CE replaces the EC definitions and pronunciation, but retains EC audio, exams, and forms.
  const ce = record(source.ce);
  if (ce) {
    const word = record(array(ce.word)[0]);
    data.isWord = word !== undefined;
    data.phonetic = text(word?.phone);
    data.explanations = array(word?.trs).flatMap((item) => {
      const translation = firstTranslation(item);
      if (!translation || !Array.isArray(translation.i)) return [];
      const words = translation.i.flatMap((item: unknown) => {
        const word = text(record(item)?.["#text"]);
        return word === undefined ? [] : [word];
      });
      const pos = text(translation.pos) ?? "";
      const note = text(translation["#tran"]) ?? "";
      return [{ text: words.join(" "), note: pos ? `${pos}  ${note}` : note }];
    });
  }

  return data;
}

function decodeSummary(value: unknown): YoudaoSummary | undefined {
  const first = record(array(record(value)?.summarys)[0]);
  const summary = text(first?.summary);
  return summary ? { subject: text(first?.key) ?? "", text: summary } : undefined;
}

function decodeSenses(value: unknown, depth = 0): ChineseSense[] {
  return array(value).flatMap((item) => {
    const sense = record(item);
    if (!sense) return [];
    return [
      {
        category: text(sense.cat),
        definition: text(sense.def) ?? (Array.isArray(sense.def) ? strings(sense.def) : undefined),
        // The existing protocol formatter removes <self> only at these first two levels.
        examples: strings(sense.examples).map((example) =>
          depth < 2 ? example.replace(/<self>|<\/self>/g, "") : example,
        ),
        subsenses: decodeSenses(sense.subsense, depth + 1),
      },
    ];
  });
}

function firstTranslation(value: unknown): Record<string, unknown> | undefined {
  return record(record(array(record(value)?.tr)[0])?.l);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return array(value).filter((item): item is string => typeof item === "string");
}
