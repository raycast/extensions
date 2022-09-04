/*
 * @author: tisfeng
 * @createTime: 2022-08-03 00:02
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-04 10:16
 * @fileName: formatData.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { chineseLanguageItem } from "../../language/consts";
import { DicionaryType, DisplaySection, ListDisplayItem } from "../../types";
import {
  BaikeSummary,
  ExplanationItem,
  KeyValueItem,
  QueryWordInfo,
  WordExplanation,
  WordForms,
  YoudaoDictionaryFormatResult,
  YoudaoDictionaryListItemType,
  YoudaoDictionaryResult,
  YoudaoWebDictionaryModel,
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
  const translation = youdaoResult.translation[0].split("\n")[0];

  let explanations: ExplanationItem[] | undefined;
  const explains = youdaoResult.basic?.explains;

  if (explains?.length) {
    explanations = youdaoResult.basic?.explains.map((explain) => {
      const item: ExplanationItem = {
        title: explain,
        subtitle: "",
      };
      return item;
    });
  }

  const formateResult: YoudaoDictionaryFormatResult = {
    queryWordInfo: queryWordInfo,
    translation: translation,
    explanations: explanations,
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
): DisplaySection[] | undefined {
  if (!formatResult) {
    return;
  }

  const displaySections: Array<DisplaySection> = [];

  const queryWordInfo = formatResult.queryWordInfo;
  const youdaoDictionaryType = DicionaryType.Youdao;
  const oneLineTranslation = formatResult.translation.split("\n").join(", ");
  const phoneticText = queryWordInfo.phonetic ? `[${queryWordInfo.phonetic}]` : undefined;
  const subtitle = queryWordInfo.word.split("\n").join(" ");

  // 1. Translation.
  const translationType = YoudaoDictionaryListItemType.Translation;
  const translationItem: ListDisplayItem = {
    displayType: translationType,
    queryType: youdaoDictionaryType,
    key: oneLineTranslation + youdaoDictionaryType,
    title: oneLineTranslation,
    subtitle: subtitle,
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
    const title = explanation.title;
    const subtitle = explanation.subtitle;
    const copyText = `${title} ${subtitle}`;

    const displayItem: ListDisplayItem = {
      displayType: explanationType,
      queryType: youdaoDictionaryType,
      key: copyText + i,
      title: title,
      subtitle: subtitle,
      queryWordInfo: queryWordInfo,
      tooltip: explanationType,
      copyText: copyText,
    };
    return displayItem;
  });
  if (explanationItems?.length) {
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
      subtitle: ` [ ${wfsText} ]`,
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
      queryWordInfo: queryWordInfo,
      tooltip: YoudaoDictionaryListItemType.WebPhrase,
      key: copyText + i,
      title: phraseKey,
      subtitle: phraseValue,
      copyText: copyText,
    };
    return webPhraseItem;
  });
  if (webPhraseItems?.length) {
    displaySections.push({
      type: YoudaoDictionaryListItemType.WebPhrase,
      items: webPhraseItems,
    });
  }

  // 6. Baike.
  const baikeType = YoudaoDictionaryListItemType.Baike;
  const baikeKey = formatResult.baike?.key || "";
  const summary = formatResult.baike?.summary || "";
  const baikeText = `${baikeKey} ${summary}`;
  const baikeItem: ListDisplayItem = {
    displayType: baikeType,
    queryType: youdaoDictionaryType,
    queryWordInfo: queryWordInfo,
    tooltip: baikeType,
    key: baikeText,
    title: baikeKey,
    subtitle: summary,
    copyText: baikeText,
  };
  if (summary) {
    displaySections.push({
      type: baikeType,
      items: [baikeItem],
    });
  }

  // * Only has "Details" can show dictionary sections. Default has one transaltion section.
  if (displaySections.length > 1) {
    // Add section title: "Details"
    const secondSection = displaySections[1];
    secondSection.sectionTitle = "Details";
    return displaySections;
  }

  console.log(`Youdao dictionary only has one translation section, so don't show dictionary sections.`);
}

/**
 * Check if Youdao dictionary has entries.
 */
export function hasYoudaoDictionaryEntries(formatResult: YoudaoDictionaryFormatResult | undefined) {
  if (!formatResult) {
    return false;
  }

  return (
    (formatResult.explanations || formatResult.forms || formatResult.webPhrases || formatResult.webTranslation) !==
    undefined
  );
}

/**
 * Format YoudaoWebDictionaryModel to YoudaoDictionaryFormatResult.
 *
 * Todo: support more dictionary, currently only support English <--> Chinese.
 */
export function formateYoudaoWebDictionaryModel(
  model: YoudaoWebDictionaryModel
): YoudaoDictionaryFormatResult | undefined {
  // if has no web translation, means no dictionary entries.
  if (!model.web_trans?.["web-translation"]?.length) {
    console.log("No Youdao dictionary entries.");
    return;
  }

  const [from, to] = getFromToLanguage(model);
  const input = model.input;
  let isWord = false;
  let phonetic: string | undefined;
  let speechUrl: string | undefined;

  const simpleWord = model.simple?.word;
  if (simpleWord?.length) {
    const word = simpleWord[0];
    phonetic = word.usphone || word.phone;
  }

  let translation = "";
  let examTypes: string[] | undefined;
  let forms: WordForms[] | undefined;

  // get baike info.
  let baike: BaikeSummary | undefined;
  const baikeSummarys = model.baike?.summarys;
  if (baikeSummarys?.length) {
    baike = baikeSummarys[0];
  }

  // format web translation.
  const webTransList: KeyValueItem[] = [];
  const webTrans = model.web_trans;
  if (webTrans) {
    const webTransItems = webTrans["web-translation"];
    if (webTransItems) {
      for (const webTransItem of webTransItems) {
        if (webTransItem.trans) {
          const transTextList: string[] = [];
          for (const trans of webTransItem.trans) {
            if (trans.value) {
              transTextList.push(trans.value);
            }
          }
          const trans: KeyValueItem = {
            key: webTransItem.key,
            value: transTextList,
          };
          webTransList.push(trans);
        }
      }
    }
  }
  // console.log(`webTransList: ${JSON.stringify(webTransList, null, 4)}`);

  let webTranslation: KeyValueItem | undefined;
  if (webTransList.length > 0) {
    const firstWebTranslation = webTransList[0];
    if (firstWebTranslation.key.toUpperCase() === input.toUpperCase()) {
      webTranslation = webTransList.shift() as KeyValueItem;
      if (webTranslation.value.length > 0) {
        translation = webTranslation.value[0].split("; ")[0];
      }
    }
  }

  const webPhrases = webTransList.slice(0, 3); // only show 3 web phrases.
  const explanations: ExplanationItem[] = [];

  // format English-->Chinese dictionary.
  if (model.ec) {
    const wordItem = model.ec.word?.length ? model.ec.word[0] : undefined;

    // word audio: https://dict.youdao.com/dictvoice?audio=good?type=0
    const usspeech = wordItem?.usspeech; // "good&type=2"
    // type=2 audio seems not accurate, eg: neon, so we use type=0.
    const queryString = `${input}&type=0`;
    const audioUrl = usspeech ? `https://dict.youdao.com/dictvoice?audio=${queryString}` : undefined;

    explanations.length = 0;
    const trs = wordItem?.trs;
    if (trs?.length) {
      for (const tr of trs) {
        if (tr.tr?.length && tr.tr[0].l?.i?.length) {
          const explanation = tr.tr[0].l?.i[0];
          const explanationItem: ExplanationItem = {
            title: explanation,
            subtitle: "",
          };
          explanations.push(explanationItem);
        }
      }
    }
    // console.log(`ec, explanations: ${JSON.stringify(explanations, null, 2)}`);

    isWord = wordItem !== undefined;
    examTypes = model.ec.exam_type;
    speechUrl = audioUrl;
    forms = wordItem?.wfs;
  }

  // format Chinese-->English dictionary.
  if (model.ce) {
    const wordItem = model.ce.word?.length ? model.ce.word[0] : undefined;
    isWord = wordItem !== undefined;

    explanations.length = 0;
    const trs = wordItem?.trs;
    if (trs) {
      for (const trsOjb of trs) {
        if (trsOjb.tr && trsOjb.tr.length) {
          const l = trsOjb.tr[0].l;
          if (l) {
            const explanationItemList = l.i.filter((item) => typeof item !== "string") as WordExplanation[];
            const text = explanationItemList.map((item) => item["#text"]).join(" ");
            const pos = l.pos ? `${l.pos}` : "";
            const tran = l["#tran"] ? `${l["#tran"]}` : "";
            const tranText = pos.length > 0 ? `${pos}  ${tran}` : tran;
            const explanationItem: ExplanationItem = {
              title: text,
              subtitle: `${tranText}`,
            };
            explanations.push(explanationItem);
          }
        }
      }
    }
    // console.log(`ce, explanations: ${JSON.stringify(explanations, null, 2)}`);
  }

  const queryWordInfo: QueryWordInfo = {
    word: input,
    fromLanguage: from,
    toLanguage: to,
    phonetic: phonetic,
    examTypes: examTypes,
    speechUrl: speechUrl,
    isWord: isWord,
  };
  // console.log(`format queryWordInfo: ${JSON.stringify(queryWordInfo, null, 2)}`);

  const formateResult: YoudaoDictionaryFormatResult = {
    queryWordInfo: queryWordInfo,
    translation: translation,
    explanations: explanations,
    forms: forms,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
    baike: baike,
  };
  queryWordInfo.hasDictionaryEntries = hasYoudaoDictionaryEntries(formateResult);
  // console.log(`Youdao format result: ${JSON.stringify(formateResult, null, 2)}`);

  return formateResult;
}

/**
 * Get Youdao from to language.
 */
export function getFromToLanguage(model: YoudaoWebDictionaryModel): [from: string, to: string] {
  let from = chineseLanguageItem.youdaoId;
  let to = chineseLanguageItem.youdaoId;
  const guessLanguage = model.meta.guessLanguage;
  if (guessLanguage === "zh") {
    to = model.le;
  } else {
    from = model.le;
  }
  return [from, to];
}
