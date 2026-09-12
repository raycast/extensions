/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { DictionaryType } from "@/types/api";
import type { DisplaySection, ListAccessoryItem, ListDisplayItem } from "@/types/display";
import type { QueryWordInfo } from "@/types/query";
import { logTrace } from "@/utils/logger";

import type { BaikeSummary, Sense, YoudaoDictionaryData } from "./types";
import { YoudaoDictionaryListItemType } from "./types";

function computeYoudaoDetailsMarkdown(title: string, subtitle?: string): string {
  if (!subtitle || subtitle.startsWith(title)) {
    return subtitle || title;
  }
  const match = subtitle.match(/"(.*?)"/);
  if (match?.[1] === title) {
    return subtitle;
  }
  return `${title} ${subtitle}`;
}

interface DictionaryItemOptions {
  key: string;
  title: string;
  subtitle?: string;
  copyText: string;
  detailsMarkdown?: string;
  accessoryItem?: ListAccessoryItem;
}

export function hasYoudaoDictionaryDetails(result: YoudaoDictionaryData): boolean {
  return Boolean(
    result.modernChineseDict?.some((dictionary) => dictionary.sense?.length) ||
    result.explanations?.length ||
    result.forms?.some((form) => form.wf?.name && form.wf.value) ||
    (result.webTranslation?.key && result.webTranslation.value.length) ||
    result.webPhrases?.some((phrase) => phrase.key && phrase.value.length) ||
    result.baike?.summary ||
    result.wikipedia?.summary,
  );
}

function buildDictionaryItem(
  displayType: YoudaoDictionaryListItemType,
  queryWordInfo: QueryWordInfo,
  { key, title, subtitle, copyText, detailsMarkdown, accessoryItem }: DictionaryItemOptions,
): ListDisplayItem {
  return {
    displayType,
    queryType: DictionaryType.Youdao,
    queryWordInfo,
    tooltip: displayType,
    key,
    title,
    subtitle,
    copyText,
    detailsMarkdown: detailsMarkdown ?? computeYoudaoDetailsMarkdown(title, subtitle),
    accessoryItem,
  };
}

function buildSummarySection(
  type: YoudaoDictionaryListItemType.Baike | YoudaoDictionaryListItemType.Wikipedia,
  queryWordInfo: QueryWordInfo,
  summaryData: BaikeSummary | undefined,
): DisplaySection | undefined {
  const key = summaryData?.key || "";
  const summary = summaryData?.summary || "";
  if (!summary) return;
  const copyText = `${key} ${summary}`;
  return {
    type,
    items: [buildDictionaryItem(type, queryWordInfo, { key: copyText, title: key, subtitle: summary, copyText })],
  };
}

export function formatYoudaoDisplaySections(
  queryWordInfo: QueryWordInfo,
  youdaoResult: YoudaoDictionaryData,
): DisplaySection[] | undefined {
  if (!hasYoudaoDictionaryDetails(youdaoResult)) return;

  const displaySections: Array<DisplaySection> = [];

  const oneLineTranslation = youdaoResult.translation.split("\n").join(", ");
  const subtitle = queryWordInfo.word.split("\n").join(" ");

  // 1. Translation.
  const translationItem = buildDictionaryItem(YoudaoDictionaryListItemType.Translation, queryWordInfo, {
    key: oneLineTranslation + DictionaryType.Youdao,
    title: oneLineTranslation,
    subtitle,
    copyText: oneLineTranslation,
    accessoryItem: {
      phonetic: queryWordInfo.phonetic,
      examTypes: queryWordInfo.examTypes,
    },
  });
  displaySections.push({
    type: YoudaoDictionaryListItemType.Translation,
    sectionTitle: DictionaryType.Youdao,
    items: [translationItem],
  });

  // 2. Modern Chinese dictionary.
  logTrace("YoudaoFormatData", "Modern Chinese dictionary");

  if (youdaoResult.modernChineseDict?.length) {
    const modernChineseDictItems: ListDisplayItem[] = [];
    youdaoResult.modernChineseDict.forEach((phoneticDict) => {
      const placeholder = `~`;
      logTrace("YoudaoFormatData", `forms: ${JSON.stringify(phoneticDict, null, 4)}`);
      const pinyin = phoneticDict.pinyin ? `${phoneticDict.pinyin}` : "";
      const accessoryItem = translationItem.accessoryItem;
      if (pinyin && accessoryItem && !accessoryItem.phonetic) {
        accessoryItem.phonetic = `/ ${pinyin} /`;
      }

      if (phoneticDict.sense?.length) {
        const senseGroups: Sense[][] = [];
        let group: Sense[] = [];
        let lastCat: string | undefined;

        for (const senseItem of phoneticDict.sense) {
          if (senseItem.cat !== lastCat) {
            if (group.length) senseGroups.push(group);
            group = [senseItem];
            lastCat = senseItem.cat;
          } else {
            group.push(senseItem);
          }
        }
        if (group.length) senseGroups.push(group);
        logTrace("YoudaoFormatData", `senseGroups: ${JSON.stringify(senseGroups, null, 4)}`);

        let markdown = pinyin;
        let subtitle = "";
        senseGroups.forEach((groups) => {
          logTrace("YoudaoFormatData", `group: ${JSON.stringify(groups, null, 4)}`);

          const firstGroup = groups[0];
          const cat = firstGroup.cat;
          let catText = cat ? `${cat} ` : "";
          if (!cat && firstGroup.def) {
            catText = placeholder;
          }

          markdown += `\n\n${catText}`;
          subtitle += catText;

          const defExampleMarkdown = getDefExampleMarkdown(groups, placeholder);
          markdown += defExampleMarkdown;

          const subtitleText = defExampleMarkdown.replace(/\n/g, " ").replace(/`/g, "");
          subtitle += subtitleText;
        });

        const title = pinyin ? `${pinyin}` : "";
        const copyText = `${title}  ${subtitle}`;
        logTrace("YoudaoFormatData", `markdown: ${markdown}`);
        logTrace("YoudaoFormatData", `copyText: ${copyText}`);

        modernChineseDictItems.push(
          buildDictionaryItem(YoudaoDictionaryListItemType.ModernChineseDict, queryWordInfo, {
            key: copyText,
            title: title,
            subtitle: subtitle,
            copyText: copyText,
            detailsMarkdown: markdown,
          }),
        );
      }
    });

    if (modernChineseDictItems?.length) {
      displaySections.push({
        type: YoudaoDictionaryListItemType.ModernChineseDict,
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
    return buildDictionaryItem(explanationType, queryWordInfo, { key: copyText + i, title, subtitle, copyText });
  });
  if (explanationItems?.length) {
    displaySections.push({
      type: YoudaoDictionaryListItemType.Explanation,
      items: explanationItems,
    });
  }

  // 4. Forms.
  const formsType = YoudaoDictionaryListItemType.Forms;
  const wfs = youdaoResult.forms?.map((wfItem) => {
    return wfItem.wf?.name + ": " + wfItem.wf?.value;
  });
  const wfsText = wfs?.join("   ");
  if (wfsText) {
    const formsMarkdown = ` [ ${wfsText} ]`;
    displaySections.push({
      type: YoudaoDictionaryListItemType.Forms,
      items: [
        buildDictionaryItem(formsType, queryWordInfo, {
          key: wfsText,
          title: "",
          subtitle: formsMarkdown,
          copyText: wfsText,
          detailsMarkdown: formsMarkdown,
        }),
      ],
    });
  }

  // 5. Web Translation.
  if (youdaoResult.webTranslation) {
    const webResultKey = youdaoResult.webTranslation.key;
    const webResultValue = youdaoResult.webTranslation.value.join("；");
    const copyText = `${webResultKey} ${webResultValue}`;
    displaySections.push({
      type: YoudaoDictionaryListItemType.WebTranslation,
      items: [
        buildDictionaryItem(YoudaoDictionaryListItemType.WebTranslation, queryWordInfo, {
          key: copyText,
          title: webResultKey,
          subtitle: webResultValue,
          copyText,
        }),
      ],
    });
  }

  // 6. Web Phrases.
  const webPhraseItems = youdaoResult.webPhrases?.map((phrase, i) => {
    const phraseKey = phrase.key;
    const phraseValue = phrase.value.join("；");
    const copyText = `${phraseKey} ${phraseValue}`;
    return buildDictionaryItem(YoudaoDictionaryListItemType.WebPhrase, queryWordInfo, {
      key: copyText + i,
      title: phraseKey,
      subtitle: phraseValue,
      copyText,
    });
  });
  if (webPhraseItems?.length) {
    displaySections.push({
      type: YoudaoDictionaryListItemType.WebPhrase,
      items: webPhraseItems,
    });
  }

  // 7. Baike.
  const baikeSection = buildSummarySection(YoudaoDictionaryListItemType.Baike, queryWordInfo, youdaoResult.baike);
  if (baikeSection) displaySections.push(baikeSection);

  // 8. Wikipedia.
  const wikipediaSection = buildSummarySection(
    YoudaoDictionaryListItemType.Wikipedia,
    queryWordInfo,
    youdaoResult.wikipedia,
  );
  if (wikipediaSection) displaySections.push(wikipediaSection);

  if (displaySections.length > 1) {
    const secondSection = displaySections[1];
    secondSection.sectionTitle = "Details";
    return displaySections;
  }

  logTrace("YoudaoFormatData", "only one translation section, not showing dictionary sections");
}

function getDefExampleMarkdown(senseList: Sense[], word: string, preText = "\n\n", tag?: number): string {
  let markdown = "";
  senseList.forEach((senseItem, i) => {
    logTrace("YoudaoFormatData", `senseItem: ${JSON.stringify(senseItem, null, 4)}`);
    let defExampleText = preText;
    const tagText = tag ? `${tag}.` : "";
    defExampleText += tagText;
    const { def, examples } = senseItem;
    let defText = "";
    if (Array.isArray(def)) {
      const defList = def;
      defText = def?.length ? defList.join("; ") : "";
    } else {
      defText = def ?? "";
    }
    defText = defText ? ` ${defText}` : "";

    if (!defText.length && senseItem.subsense?.length) {
      defText = ` ${word}`;
    }
    logTrace("YoudaoFormatData", `defText: ${defText}`);

    const example = examples?.map((item) => `\`${item}\``).join("/");
    const exampleText = example ? `：${example}  ` : "";

    if (defText.length || exampleText.length) {
      defExampleText += `${i + 1}.${defText}${exampleText}`;
    }

    logTrace("YoudaoFormatData", `defExampleText: ${defExampleText}`);
    const subsensesList = senseItem.subsense;
    if (subsensesList?.length) {
      const subsenseDefExampleText = getDefExampleMarkdown(subsensesList, word, "\n", i + 1);
      logTrace("YoudaoFormatData", `subsenseDefExampleText: ${subsenseDefExampleText}`);
      defExampleText += "  " + subsenseDefExampleText + "";
    }

    markdown += defExampleText;
  });

  return markdown;
}
