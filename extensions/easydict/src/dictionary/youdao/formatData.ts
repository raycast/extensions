/*
 * @author: tisfeng
 * @createTime: 2022-08-03 00:02
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-17 23:31
 * @fileName: formatData.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { chineseLanguageItem } from "../../language/consts";
import { DictionaryType, DisplaySection, ListDisplayItem } from "../../types";
import {
  BaikeSummary,
  ExplanationItem,
  KeyValueItem,
  ModernChineseDataList,
  QueryWordInfo,
  Sense,
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
  youdaoResult: YoudaoDictionaryResult,
): YoudaoDictionaryFormatResult | undefined {
  // when youdao request error, query is not exist.
  if (!youdaoResult.query) {
    return;
  }

  const [from, to] = youdaoResult.l.split("2"); // from2to
  const usPhonetic = youdaoResult.basic?.["us-phonetic"]; // may be two phonetic "trænzˈleɪʃn; trænsˈleɪʃn"
  const phonetic = usPhonetic || youdaoResult.basic?.phonetic;
  const phoneticText = phonetic ? `[${phonetic}]` : undefined;

  // get no more than 6 exam types
  const examTypes = youdaoResult.basic?.exam_type?.slice(-6);
  console.warn(`examTypes: ${examTypes}`);

  const queryWordInfo: QueryWordInfo = {
    word: youdaoResult.query,
    phonetic: phoneticText,
    fromLanguage: from,
    toLanguage: to,
    isWord: youdaoResult.isWord,
    examTypes: examTypes,
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

  const formatResult: YoudaoDictionaryFormatResult = {
    queryWordInfo: queryWordInfo,
    translation: translation,
    explanations: explanations,
    forms: youdaoResult.basic?.wfs,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
  };
  queryWordInfo.hasDictionaryEntries = hasYoudaoDictionaryEntries(formatResult);

  return formatResult;
}

/**
 * Update Youdao dictionary display result.
 */
export function updateYoudaoDictionaryDisplay(
  youdaoResult: YoudaoDictionaryFormatResult | undefined,
): DisplaySection[] | undefined {
  if (!youdaoResult) {
    return;
  }

  const displaySections: Array<DisplaySection> = [];

  const queryWordInfo = youdaoResult.queryWordInfo;
  const youdaoDictionaryType = DictionaryType.Youdao;
  const oneLineTranslation = youdaoResult.translation.split("\n").join(", ");
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
      phonetic: queryWordInfo.phonetic,
      examTypes: queryWordInfo.examTypes,
    },
  };
  displaySections.push({
    type: youdaoDictionaryType,
    sectionTitle: youdaoDictionaryType,
    items: [translationItem],
  });

  // 2. Modern Chinese dictionary.
  const modernChineseDict = youdaoResult.modernChineseDict;
  const modernChineseDictType = YoudaoDictionaryListItemType.ModernChineseDict;

  console.log(`Modern Chinese dictionary`);

  if (modernChineseDict?.length) {
    const modernChineseDictItems: ListDisplayItem[] = [];
    modernChineseDict.forEach((phoneticDict) => {
      const placeholder = `~`;
      console.log(`forms: ${JSON.stringify(phoneticDict, null, 4)}`);
      const pinyin = phoneticDict.pinyin ? `${phoneticDict.pinyin}` : "";
      const accessoryItem = translationItem.accessoryItem;
      if (pinyin && accessoryItem && !accessoryItem.phonetic) {
        accessoryItem.phonetic = `/ ${pinyin} /`;
      }

      if (phoneticDict.sense?.length) {
        let lastCat: string | undefined;
        const senseGroups: Sense[][] = [];

        const copyFormsSense = JSON.parse(JSON.stringify(phoneticDict.sense)) as Sense[];
        console.log(`copyFormsSense: ${JSON.stringify(copyFormsSense, null, 4)}`);

        // * group senses by category
        let group: Sense[] = [];
        while (copyFormsSense.length > 0) {
          const senseItem = copyFormsSense.shift();
          if (senseItem) {
            const cat = senseItem.cat;
            if (cat !== lastCat) {
              if (group.length) {
                senseGroups.push(group);
              }
              group = [];
              group.push(senseItem);
              lastCat = cat;
            } else {
              group.push(senseItem);
            }
          }
        }
        senseGroups.push(group);
        console.log(`senseGroups: ${JSON.stringify(senseGroups, null, 4)}`);

        let markdown = pinyin;
        let subtitle = "";
        senseGroups.forEach((groups) => {
          console.log(`group: ${JSON.stringify(groups, null, 4)}`);

          const firstGroup = groups[0];
          const cat = firstGroup.cat;
          let catText = cat ? `${cat} ` : "";
          if (!cat && firstGroup.def) {
            catText = placeholder;
          }

          markdown += `\n\n${catText}`;
          subtitle += catText;

          const defExampleMarkdown = "" + getDefExampleMarkdown(groups, placeholder);
          markdown += `${defExampleMarkdown}`;

          let subtitleText = defExampleMarkdown.replaceAll("\n", " ");
          subtitleText = subtitleText.replaceAll("`", "");
          subtitle += subtitleText;
        });

        const title = pinyin ? `${pinyin}` : "";
        const copyText = `${title}  ${subtitle}`;
        console.log(`markdown: ${markdown}`);
        console.log(`copyText: ${copyText}`);

        const displayItem: ListDisplayItem = {
          displayType: modernChineseDictType,
          queryType: youdaoDictionaryType,
          key: copyText,
          title: title,
          subtitle: subtitle,
          queryWordInfo: queryWordInfo,
          tooltip: modernChineseDictType,
          copyText: copyText,
          detailsMarkdown: markdown,
        };
        modernChineseDictItems.push(displayItem);
      }
    });

    if (modernChineseDictItems?.length) {
      displaySections.push({
        type: modernChineseDictType,
        items: modernChineseDictItems,
      });
    }
  }

  // 3. Explanation.
  const explanationType = YoudaoDictionaryListItemType.Explanation;
  const explanationItems = youdaoResult.explanations?.map((explanation, i) => {
    const title = explanation.title;
    const subtitle = explanation.subtitle ? ` ${explanation.subtitle}` : "";
    const copyText = `${title}${subtitle}`;

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

  // 4. Forms.
  const formsType = YoudaoDictionaryListItemType.Forms;
  const wfs = youdaoResult.forms?.map((wfItem) => {
    return wfItem.wf?.name + ": " + wfItem.wf?.value;
  });
  // [ 复数：goods   比较级：better   最高级：best ]
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

  // 5. Web Translation.
  if (youdaoResult.webTranslation) {
    const webResultKey = youdaoResult.webTranslation.key;
    const webResultValue = youdaoResult.webTranslation.value.join("；");
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

  // 6. Web Phrases.
  const webPhraseItems = youdaoResult.webPhrases?.map((phrase, i) => {
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

  // 7. Baike.
  const baikeType = YoudaoDictionaryListItemType.Baike;
  const baikeKey = youdaoResult.baike?.key || "";
  const summary = youdaoResult.baike?.summary || "";
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

  // 8. Wikipedia.
  const wikipediaType = YoudaoDictionaryListItemType.Wikipedia;
  const wikipediaKey = youdaoResult.wikipedia?.key || "";
  const wikipediaSummary = youdaoResult.wikipedia?.summary || "";
  const wikipediaText = `${wikipediaKey} ${wikipediaSummary}`;
  const wikipediaItem: ListDisplayItem = {
    displayType: wikipediaType,
    queryType: youdaoDictionaryType,
    queryWordInfo: queryWordInfo,
    tooltip: wikipediaType,
    key: wikipediaText,
    title: wikipediaKey,
    subtitle: wikipediaSummary,
    copyText: wikipediaText,
  };
  if (wikipediaSummary) {
    displaySections.push({
      type: wikipediaType,
      items: [wikipediaItem],
    });
  }

  // * Only has "Details" can show dictionary sections. Default has one translation section.
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
    (formatResult.explanations ||
      formatResult.forms ||
      formatResult.webPhrases ||
      formatResult.webTranslation ||
      formatResult.baike ||
      formatResult.wikipedia) !== undefined
  );
}

/**
 * Format YoudaoWebDictionaryModel to YoudaoDictionaryFormatResult.
 *
 * Todo: support more dictionary, currently only support English <--> Chinese.
 */
export function formatYoudaoWebDictionaryModel(model: YoudaoWebDictionaryModel): YoudaoDictionaryFormatResult {
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

    // * Don't use simpleWord, because it maybe has multiple phonetics, eg: "record".
    phoneticText = getPhoneticDisplayText(wordItem?.usphone);

    // Word audio: https://dict.youdao.com/dictvoice?audio=good&type=2
    const usspeech = wordItem?.usspeech; // "good&type=2"
    const audioUrl = usspeech ? `https://dict.youdao.com/dictvoice?audio=${usspeech}` : undefined;
    console.log(`${input}, audioUrl: ${audioUrl}`);

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
    // console.log(`ec, explanations: ${JSON.stringify(explanations, null, 4)}`);

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
    // console.log(`ce, explanations: ${JSON.stringify(explanations, null, 4)}`);
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
  // console.log(`format queryWordInfo: ${JSON.stringify(queryWordInfo, null, 4)}`);

  const formatResult: YoudaoDictionaryFormatResult = {
    queryWordInfo: queryWordInfo,
    translation: translation,
    explanations: explanations,
    forms: forms,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
    baike: baike,
    wikipedia: wikipediaDigest,
    modernChineseDict: newChineseDataList,
  };

  queryWordInfo.hasDictionaryEntries = hasYoudaoDictionaryEntries(formatResult);
  // console.log(`Youdao format result: ${JSON.stringify(formatResult, null, 4)}`);

  return formatResult;
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
export function formatNewChineseDict(dataList: ModernChineseDataList[]): ModernChineseDataList[] | undefined {
  if (!dataList.length) {
    return;
  }

  const newDataList: ModernChineseDataList[] = JSON.parse(JSON.stringify(dataList));
  if (newDataList.length) {
    for (const dict of newDataList) {
      const senseList = dict.sense;
      if (senseList?.length) {
        for (const sense of senseList) {
          sense.examples = removeExamplesHtmlTag(sense.examples);

          if (sense.subsense?.length) {
            for (const subsense of sense.subsense) {
              subsense.examples = removeExamplesHtmlTag(subsense.examples);
            }
          }
        }
      }
    }
  }
  return newDataList;
}

/**
 * Remove self html tag.
 */
function removeSelfHtmlTag(text: string): string {
  // return text.replace(/<[^>]+>/g, "");
  return text.replaceAll(/<self>|<\/self>/g, "");
}

/**
 * Remove examples html tag.
 */
function removeExamplesHtmlTag(examples: string[] | undefined): string[] {
  const newExamples: string[] = [];
  if (examples?.length) {
    for (const example of examples) {
      const newExample = removeSelfHtmlTag(example);
      newExamples.push(newExample);
    }
  }
  return newExamples;
}

/**
 * Get defExample markdown from senseList.
 *
 * Test: 艾，为，的，帝
 */
function getDefExampleMarkdown(senseList: Sense[], word: string, preText = "\n\n", tag?: number): string {
  let markdown = "";
  senseList.forEach((senseItem, i) => {
    console.log(`senseItem: ${JSON.stringify(senseItem, null, 4)}`);
    let defExampleText = preText;
    const tagText = tag ? `${tag}.` : "";
    defExampleText += tagText;
    const { def, examples } = senseItem;
    let defText = "";
    if (Array.isArray(def)) {
      const defList = def;
      defText = def?.length ? defList.join("; ") : "";
    } else {
      const defString = def as string;
      defText = defString;
    }
    defText = defText ? ` ${defText}` : "";

    // handle special case, eg. 为
    if (!defText.length && senseItem.subsense?.length) {
      defText = ` ${word}`;
    }
    console.log(`defText: ${defText}`);

    const example = examples?.map((item) => `\`${item}\``).join("/");
    const exampleText = example ? `：${example}  ` : "";

    if (defText.length || exampleText.length) {
      defExampleText += `${i + 1}.${defText}${exampleText}`;
    }

    console.log(`defExampleText: ${defExampleText}`);
    const subsensesList = senseItem.subsense;
    if (subsensesList?.length) {
      const subsenseDefExampleText = getDefExampleMarkdown(subsensesList, word, "\n", i + 1);
      console.log(`subsenseDefExampleText: ${subsenseDefExampleText}`);
      defExampleText += "  " + subsenseDefExampleText + "";
    }

    markdown += defExampleText;
  });

  return markdown;
}
