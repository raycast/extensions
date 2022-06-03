import { SectionType, TranslationType } from "./consts";
import {
  QueryTextInfo,
  TranslateDisplayResult,
  TranslateReformatResult,
  TranslateSourceResult,
  TranslationItem,
} from "./types";
import { isPreferredChinese } from "./utils";

export function reformatTranslateResult(
  src: TranslateSourceResult
): TranslateReformatResult {
  let translations: TranslationItem[] = [];

  const youdaoTranslations = src.youdaoResult.translation.map(
    (translationText) => {
      return {
        type: TranslationType.Youdao,
        text: translationText,
      };
    }
  );

  translations.push(...youdaoTranslations);

  const baiduTranslation = src.baiduResult.trans_result
    .map((item) => {
      return item.dst;
    })
    .join(" ");

  translations.push({
    type: TranslationType.Baidu,
    text: baiduTranslation,
  });

  if (src.caiyunResult) {
    translations.push({
      type: TranslationType.Caiyun,
      text: src.caiyunResult?.target,
    });
  }

  const [from, to] = src.youdaoResult.l.split("2"); // from2to
  const queryTextInfo: QueryTextInfo = {
    query: src.youdaoResult.query,
    phonetic: src.youdaoResult.basic?.phonetic,
    from: from,
    to: to,
    isWord: src.youdaoResult.isWord,
    examTypes: src.youdaoResult.basic?.exam_type,
  };

  let webTranslation;
  if (src.youdaoResult.web) {
    webTranslation = src.youdaoResult.web[0];
  }
  const webPhrases = src.youdaoResult.web?.slice(1);

  return {
    queryTextInfo: queryTextInfo,
    translations: translations,
    explanations: src.youdaoResult.basic?.explains,
    forms: src.youdaoResult.basic?.wfs,
    webTranslation: webTranslation,
    webPhrases: webPhrases,
  };
}

export function reformatTranslateDisplayResult(
  reformatResult: TranslateReformatResult
): TranslateDisplayResult[] {
  let displayResult: Array<TranslateDisplayResult> = [];

  // console.log("reformatResult: ", JSON.stringify(reformatResult));

  const isShowMultipleTranslations =
    !reformatResult.explanations &&
    !reformatResult.forms &&
    !reformatResult.webPhrases &&
    !reformatResult.webTranslation;

  for (const [i, translation] of reformatResult.translations.entries()) {
    let sectionType = isShowMultipleTranslations
      ? translation.type
      : SectionType.Translation;
    let sectionTitle: any = sectionType;
    let tooltip: string = translation.type;

    if (isShowMultipleTranslations) {
      tooltip = "";
    }

    let oneLineTranslation = translation.text.split("\n").join("");

    displayResult.push({
      type: sectionType,
      sectionTitle: sectionTitle,
      items: [
        {
          key: oneLineTranslation + i,
          title: oneLineTranslation,
          tooltip: tooltip,
          copyText: oneLineTranslation,
          phonetic: reformatResult.queryTextInfo.phonetic,
          examTypes: reformatResult.queryTextInfo.examTypes,
        },
      ],
    });

    if (!isShowMultipleTranslations) {
      break;
    }
  }

  let hasShowDetailsSectionTitle = false;
  let detailsSectionTitle = "Details";

  reformatResult.explanations?.forEach((explanation, i) => {
    displayResult.push({
      type: SectionType.Explanations,
      sectionTitle: !hasShowDetailsSectionTitle
        ? detailsSectionTitle
        : undefined,
      items: [
        {
          key: explanation + i,
          title: explanation,
          tooltip: SectionType.Explanations,
          copyText: explanation,
        },
      ],
    });

    hasShowDetailsSectionTitle = true;
  });

  const wfs = reformatResult.forms?.map((wfItem, idx) => {
    return wfItem.wf?.name + " " + wfItem.wf?.value;
  });

  // [ 复数 goods   比较级 better   最高级 best ]
  const wfsText = wfs?.join("   ") || "";
  if (wfsText.length) {
    displayResult.push({
      type: SectionType.Forms,
      sectionTitle: !hasShowDetailsSectionTitle
        ? detailsSectionTitle
        : undefined,
      items: [
        {
          key: wfsText,
          title: "",
          tooltip: SectionType.Forms,
          subtitle: `[ ${wfsText} ]`,
          copyText: wfsText,
        },
      ],
    });

    hasShowDetailsSectionTitle = true;
  }

  if (reformatResult.webTranslation) {
    const webResultKey = reformatResult.webTranslation?.key;
    const webResultValue = reformatResult.webTranslation.value.join("；");
    displayResult.push({
      type: SectionType.WebTranslation,
      sectionTitle: !hasShowDetailsSectionTitle
        ? detailsSectionTitle
        : undefined,
      items: [
        {
          key: webResultKey,
          title: webResultKey,
          tooltip: SectionType.WebTranslation,
          subtitle: webResultValue,
          copyText: `${webResultKey} ${webResultValue}`,
        },
      ],
    });

    hasShowDetailsSectionTitle = true;
  }

  reformatResult.webPhrases?.forEach((phrase, i) => {
    const phraseKey = phrase.key;
    const phraseValue = phrase.value.join("；");
    displayResult.push({
      type: SectionType.WebPhrase,
      sectionTitle: !hasShowDetailsSectionTitle
        ? detailsSectionTitle
        : undefined,
      items: [
        {
          key: phraseKey + i,
          title: phraseKey,
          tooltip: SectionType.WebPhrase,
          subtitle: phraseValue,
          copyText: `${phraseKey} ${phraseValue}`,
        },
      ],
    });

    hasShowDetailsSectionTitle = true;
  });

  // console.log("displayResult: ", JSON.stringify(displayResult));

  return displayResult;
}
