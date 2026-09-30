/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { chineseLanguageItem } from "@/core/language/consts";
import type { QueryWordInfo } from "@/types/query";
import { logTrace } from "@/utils/logger";

import type {
  BaikeSummary,
  ExplanationItem,
  KeyValueItem,
  ModernChineseDataList,
  WordExplanation,
  WordForms,
  YoudaoDictionaryData,
  YoudaoParseResult,
  YoudaoWebDictionaryModel,
} from "./types";

/**
 * Format YoudaoWebDictionaryModel into word metadata and provider-specific dictionary data.
 *
 * Todo: support more dictionary, currently only support English <--> Chinese.
 */
export function formatYoudaoWebDictionaryModel(model: YoudaoWebDictionaryModel): YoudaoParseResult {
  const [from, to] = getFromToLanguage(model);
  const input = model.input;
  let isWord = false;
  let phoneticText: string | undefined;
  let speechUrl: string | undefined;

  let translation = "";
  let examTypes: string[] | undefined;
  let forms: WordForms[] | undefined;

  // get baike info.
  let baike: BaikeSummary | undefined;
  // Todo: use baidu baike api to get baike info.
  const baikeSummarys = model.baike?.summarys;
  if (baikeSummarys?.length) {
    baike = baikeSummarys[0];
  }

  // get wikipedia_digest.
  let wikipediaDigest: BaikeSummary | undefined;
  const wikipediaDigests = model.wikipedia_digest?.summarys;
  if (wikipediaDigests?.length) {
    wikipediaDigest = wikipediaDigests[0];
  }

  let newChineseDataList: ModernChineseDataList[] | undefined;
  const dataList = model.newhh?.dataList;
  if (dataList?.length) {
    newChineseDataList = formatNewChineseDict(dataList);
  }

  // format web translation.
  const webTransList: KeyValueItem[] = (model.web_trans?.["web-translation"] ?? []).flatMap((item) => {
    if (!item.trans?.length) return [];
    const values = item.trans
      .map((translation) => translation.value)
      .filter((value): value is string => value !== undefined);
    return [{ key: item.key, value: values }];
  });

  let webTranslation: KeyValueItem | undefined;
  if (webTransList.length > 0) {
    const firstWebTranslation = webTransList[0];
    if (firstWebTranslation.key.toUpperCase() === input.toUpperCase()) {
      webTranslation = webTransList.shift();
      if (webTranslation?.value.length) {
        translation = webTranslation.value[0].split("; ")[0];
      }
    }
  }

  const webPhrases = webTransList.slice(0, 3); // only show 3 web phrases.
  const explanations: ExplanationItem[] = [];

  // format English-->Chinese dictionary.
  if (model.ec) {
    const wordItem = model.ec.word?.length ? model.ec.word[0] : undefined;

    // * Don't use simpleWord, because it maybe has multiple phonetics, eg: "record".
    phoneticText = getPhoneticDisplayText(wordItem?.usphone);

    // Word audio: https://dict.youdao.com/dictvoice?audio=good&type=2
    const usspeech = wordItem?.usspeech; // "good&type=2"
    const audioUrl = usspeech ? `https://dict.youdao.com/dictvoice?audio=${usspeech}` : undefined;
    logTrace("YoudaoFormatData", `${input}, audioUrl: ${audioUrl}`);

    explanations.length = 0;
    const trs = wordItem?.trs || [];
    for (const tr of trs) {
      const explanation = tr.tr?.[0]?.l?.i?.[0];
      if (explanation) {
        explanations.push({ title: explanation, subtitle: "" });
      }
    }

    isWord = wordItem !== undefined; // Todo: need to check more.
    examTypes = model.ec.exam_type?.slice(-6);
    speechUrl = audioUrl;
    forms = wordItem?.wfs;
  }

  // format Chinese-->English dictionary.
  if (model.ce) {
    const wordItem = model.ce.word?.length ? model.ce.word[0] : undefined;
    isWord = wordItem !== undefined;

    phoneticText = getPhoneticDisplayText(wordItem?.phone);

    explanations.length = 0;
    const trs = wordItem?.trs || [];
    for (const trsOjb of trs) {
      const l = trsOjb.tr?.[0]?.l;
      if (l) {
        const explanationItemList = l.i.filter((item) => typeof item !== "string") as WordExplanation[];
        const text = explanationItemList.map((item) => item["#text"]).join(" ");
        const pos = l.pos ? `${l.pos}` : "";
        const tran = l["#tran"] ? `${l["#tran"]}` : "";
        const tranText = pos ? `${pos}  ${tran}` : tran;
        explanations.push({ title: text, subtitle: tranText });
      }
    }
  }

  const queryWordInfo: QueryWordInfo = {
    word: input,
    fromLanguage: from,
    toLanguage: to,
    phonetic: phoneticText,
    examTypes: examTypes,
    speechUrl: speechUrl,
    isWord: isWord,
  };

  const result: YoudaoDictionaryData = {
    translation: translation,
    explanations: explanations,
    forms: forms,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
    baike: baike,
    wikipedia: wikipediaDigest,
    modernChineseDict: newChineseDataList,
  };

  return { queryWordInfo, result };
}

/**
 * Get Youdao from to language.
 */
function getFromToLanguage(model: YoudaoWebDictionaryModel): [from: string, to: string] {
  let from = chineseLanguageItem.youdaoLangCode;
  let to = chineseLanguageItem.youdaoLangCode;
  // * Note: guessLanguage may be incorrect, eg: 鶗鴂 --> eng
  const guessLanguage = model.meta?.guessLanguage;
  if (guessLanguage === "zh") {
    to = model.le;
  } else {
    from = model.le;
  }
  return [from, to];
}

/**
 * Get word phonetic display text. eg: gʊd --> / gʊd /
 */
function getPhoneticDisplayText(phonetic: string | undefined): string | undefined {
  const phoneticText = phonetic ? `/ ${phonetic} /` : undefined;
  return phoneticText;
}

/**
 * Format New Chinese dictionary.
 */
function formatNewChineseDict(dataList: ModernChineseDataList[]): ModernChineseDataList[] | undefined {
  if (!dataList.length) return undefined;

  return dataList.map((dict) => ({
    ...dict,
    sense: dict.sense?.map((sense) => ({
      ...sense,
      examples: removeExamplesHtmlTag(sense.examples),
      subsense: sense.subsense?.map((subsense) => ({
        ...subsense,
        examples: removeExamplesHtmlTag(subsense.examples),
      })),
    })),
  }));
}

/**
 * Remove self html tag.
 */
function removeSelfHtmlTag(text: string): string {
  return text.replace(/<self>|<\/self>/g, "");
}

/**
 * Remove examples html tag.
 */
function removeExamplesHtmlTag(examples: string[] | undefined): string[] {
  if (!examples?.length) return [];
  return examples.map(removeSelfHtmlTag);
}
