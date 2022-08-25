/*
 * @author: tisfeng
 * @createTime: 2022-08-03 00:02
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-19 16:21
 * @fileName: formatData.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { DicionaryType, DisplaySection, ListDisplayItem } from "../../types";
import {
  QueryWordInfo,
  YoudaoDictionaryFormatResult,
  YoudaoDictionaryListItemType,
  YoudaoDictionaryResult,
} from "./types";

/**
 * Format the Youdao original data for later use.
 */
export function formatYoudaoDictionaryResult(
  youdaoResult: YoudaoDictionaryResult
): YoudaoDictionaryFormatResult | undefined {
  // when youdao request error, query is not exist.
  if (!youdaoResult.query) {
    return;
  }

  const [from, to] = youdaoResult.l.split("2"); // from2to
  let usPhonetic = youdaoResult.basic?.["us-phonetic"]; // may be two phonetic "trænzˈleɪʃn; trænsˈleɪʃn"
  usPhonetic = usPhonetic?.split("; ")[1] || usPhonetic;
  const queryWordInfo: QueryWordInfo = {
    word: youdaoResult.query,
    phonetic: usPhonetic || youdaoResult.basic?.phonetic,
    fromLanguage: from,
    toLanguage: to,
    isWord: youdaoResult.isWord,
    examTypes: youdaoResult.basic?.exam_type,
    speechUrl: youdaoResult.speakUrl,
  };

  let webTranslation;
  if (youdaoResult.web) {
    webTranslation = youdaoResult.web[0];
  }
  const webPhrases = youdaoResult.web?.slice(1);
  // * only use the first translation
  const translations = youdaoResult.translation[0].split("\n");
  const formateResult: YoudaoDictionaryFormatResult = {
    queryWordInfo: queryWordInfo,
    translations: translations,
    explanations: youdaoResult.basic?.explains,
    forms: youdaoResult.basic?.wfs,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
  };
  queryWordInfo.hasDictionaryEntries = hasYoudaoDictionaryEntries(formateResult);

  return formateResult;
}

/**
 * Update Youdao dictionary display result.
 */
export function updateYoudaoDictionaryDisplay(
  formatResult: YoudaoDictionaryFormatResult | undefined
): DisplaySection[] {
  const displaySections: Array<DisplaySection> = [];
  if (!formatResult) {
    return displaySections;
  }

  const queryWordInfo = formatResult.queryWordInfo;
  const youdaoDictionaryType = DicionaryType.Youdao;
  const oneLineTranslation = formatResult.translations.join(", ");
  const phoneticText = queryWordInfo.phonetic ? `[${queryWordInfo.phonetic}]` : undefined;
  const isShowWordSubtitle = phoneticText || queryWordInfo.examTypes;
  const wordSubtitle = isShowWordSubtitle ? queryWordInfo.word : undefined;

  // 1. Translation.
  const translationType = YoudaoDictionaryListItemType.Translation;
  const translationItem: ListDisplayItem = {
    displayType: translationType,
    queryType: youdaoDictionaryType,
    key: oneLineTranslation + youdaoDictionaryType,
    title: oneLineTranslation,
    subtitle: wordSubtitle,
    tooltip: translationType,
    copyText: oneLineTranslation,
    queryWordInfo: queryWordInfo,
    accessoryItem: {
      phonetic: phoneticText,
      examTypes: queryWordInfo.examTypes,
    },
  };
  displaySections.push({
    type: youdaoDictionaryType,
    sectionTitle: youdaoDictionaryType,
    items: [translationItem],
  });

  // 2. Explanation.
  const explanationType = YoudaoDictionaryListItemType.Explanation;
  const explanationItems = formatResult.explanations?.map((explanation, i) => {
    const displayItem: ListDisplayItem = {
      displayType: explanationType,
      queryType: youdaoDictionaryType,
      key: explanation + i,
      title: explanation,
      queryWordInfo: queryWordInfo,
      tooltip: explanationType,
      copyText: explanation,
    };
    return displayItem;
  });
  if (explanationItems) {
    displaySections.push({
      type: youdaoDictionaryType,
      items: explanationItems,
    });
  }

  // 3. Forms.
  const formsType = YoudaoDictionaryListItemType.Forms;
  const wfs = formatResult.forms?.map((wfItem) => {
    return wfItem.wf?.name + ": " + wfItem.wf?.value;
  });
  // [ 复数: goods   比较级: better   最高级: best ]
  const wfsText = wfs?.join("   ");
  if (wfsText) {
    const formsItem: ListDisplayItem = {
      displayType: formsType,
      queryType: youdaoDictionaryType,
      key: wfsText,
      title: "",
      queryWordInfo: queryWordInfo,
      tooltip: formsType,
      subtitle: `[ ${wfsText} ]`,
      copyText: wfsText,
    };
    displaySections.push({
      type: youdaoDictionaryType,
      items: [formsItem],
    });
  }

  // 4. Web Translation.
  if (formatResult.webTranslation) {
    const webResultKey = formatResult.webTranslation.key;
    const webResultValue = formatResult.webTranslation.value.join("；");
    const copyText = `${webResultKey} ${webResultValue}`;

    const webTranslationItem: ListDisplayItem = {
      displayType: YoudaoDictionaryListItemType.WebTranslation,
      queryType: youdaoDictionaryType,
      key: copyText,
      title: webResultKey,
      queryWordInfo: queryWordInfo,
      tooltip: YoudaoDictionaryListItemType.WebTranslation,
      subtitle: webResultValue,
      copyText: copyText,
    };
    displaySections.push({
      type: YoudaoDictionaryListItemType.WebTranslation,
      items: [webTranslationItem],
    });
  }

  // 5. Web Phrases.
  const webPhraseItems = formatResult.webPhrases?.map((phrase, i) => {
    const phraseKey = phrase.key;
    const phraseValue = phrase.value.join("；");
    const copyText = `${phraseKey} ${phraseValue}`;

    const webPhraseItem: ListDisplayItem = {
      displayType: YoudaoDictionaryListItemType.WebPhrase,
      queryType: youdaoDictionaryType,
      key: copyText + i,
      title: phraseKey,
      queryWordInfo: queryWordInfo,
      tooltip: YoudaoDictionaryListItemType.WebPhrase,
      subtitle: phraseValue,
      copyText: copyText,
    };
    return webPhraseItem;
  });
  if (webPhraseItems) {
    displaySections.push({
      type: YoudaoDictionaryListItemType.WebPhrase,
      items: webPhraseItems,
    });
  }

  // Add section title: "Details"
  if (displaySections.length > 1) {
    const secondSection = displaySections[1];
    secondSection.sectionTitle = "Details";
  }

  return displaySections;
}

/**
 * Check if Youdao dictionary has entries.
 */
export function hasYoudaoDictionaryEntries(formatResult: YoudaoDictionaryFormatResult) {
  return (
    (formatResult.explanations || formatResult.forms || formatResult.webPhrases || formatResult.webTranslation) !==
    undefined
  );
}
