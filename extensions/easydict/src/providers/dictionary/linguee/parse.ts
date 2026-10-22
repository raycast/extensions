/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { parse } from "node-html-parser";
import type { default as HtmlNode } from "node-html-parser/dist/nodes/html";

import type { ContentEquivalent, ContentExample } from "@/core/content/types";
import { getLanguageItemFromDeepLSourceCode } from "@/core/language/utils";
import type { QueryWordInfo } from "@/core/results/types";
import { logWarn } from "@/shared/logger";

import type { LingueeDictionaryResult, LingueeParseResult, LingueeWordItem } from "./types";

function getTagFormsText(tagForms: HtmlNode | null): string {
  const text = tagForms?.textContent ?? "";
  const stripped = text.replace(/[()]/g, "").trim();
  return stripped ? text : "";
}

function getExplanationFrequency(wordFrequency: string): ContentEquivalent["frequency"] {
  if (wordFrequency.includes("(often used)")) return "often";
  if (wordFrequency.includes("(almost always used)")) return "almost-always";
  if (wordFrequency.length > 0) return "special-forms";
  return "common";
}

function getYoudaoLanguageId(language: string, rootElement: HtmlNode): string | undefined {
  const textJavascript = rootElement.querySelector("script[type=text/javascript]");
  const sourceLang = textJavascript?.textContent?.split(`${language}:`)[1]?.split(",")[0];
  if (!sourceLang) return undefined;
  return getLanguageItemFromDeepLSourceCode(sourceLang.replace(/'/g, ""))?.youdaoLangCode;
}

function parseExplanation(
  translation: HtmlNode,
  prominent: boolean,
  frequency?: ContentEquivalent["frequency"],
): ContentEquivalent {
  const entry: ContentEquivalent = {
    text: translation.querySelector(".dictLink")?.textContent ?? "",
    partOfSpeech: translation.querySelector(".tag_type")?.textContent ?? "",
    prominent,
    frequency: frequency ?? "common",
  };
  if (!prominent) return entry;

  const tagC = translation.querySelector(".tag_c");
  const tagForms = translation.querySelector(".tag_forms");
  const tagText = `${tagC?.textContent ?? ""} ${getTagFormsText(tagForms)}`.trim();

  return {
    ...entry,
    firstExampleTranslation: translation.querySelector(".example")?.querySelector(".tag_t")?.textContent ?? "",
    inflectionNote: tagText,
    frequency: getExplanationFrequency(tagText),
  };
}

function parseHeadword(lemma: HtmlNode) {
  const placeholder = lemma.querySelector(".dictLink .placeholder");
  let placeholderText = placeholder?.textContent ?? "";
  placeholder?.remove();

  const dictLinks = lemma.querySelectorAll(".lemma_desc .dictLink");
  const words = dictLinks.map((link) => link?.textContent ?? "").join(" ");

  const tagLemmaContext = lemma.querySelector(".tag_lemma_context");
  if (tagLemmaContext) {
    placeholderText = tagLemmaContext.textContent ?? "";
  }

  const tagWordtype = lemma.querySelector(".lemma_desc .tag_wordtype");
  const tagFormsText = getTagFormsText(lemma.querySelector(".lemma_desc .tag_forms"));
  const tagArea = lemma.querySelector(".lemma_desc .tag_area");
  const posText = `${tagWordtype?.textContent ?? ""} ${tagFormsText} ${tagArea?.textContent ?? ""}`.trim();
  const pos = tagWordtype ? posText : (lemma.querySelector(".tag_type")?.textContent ?? "");
  return { word: words, pos, placeholder: placeholderText };
}

function extractTranslations(lemma: HtmlNode): [HtmlNode[], HtmlNode[]] {
  const featured = lemma.querySelectorAll(".translation.sortablemg.featured");
  featured.forEach((element) => element.remove());
  return [featured, lemma.querySelector(".lemma_content")?.querySelectorAll(".translation") ?? []];
}

function parseWordItem(lemma: HtmlNode): LingueeWordItem {
  const headword = parseHeadword(lemma);
  const [featured, unfeatured] = extractTranslations(lemma);
  const frequency = lemma.querySelector(".lemma_content")?.querySelector(".line .notascommon")
    ? "less-common"
    : "common";

  return {
    ...headword,
    entries: [
      ...featured.map((element) => parseExplanation(element, true)),
      ...unfeatured.map((element) => parseExplanation(element, false, frequency)),
    ],
  };
}

function parseExampleItems(lemmas: HtmlNode[]): ContentExample[] {
  return lemmas.map((lemma) => {
    const tagType = lemma.querySelector(".line .tag_type");
    const pos = tagType?.textContent ?? "";
    return {
      sentence: lemma.querySelector(".line .dictLink")?.textContent ?? "",
      partOfSpeech: pos,
      translation: lemma
        .querySelectorAll(".lemma_content .dictLink")
        .filter((el) => el.textContent)
        .map((el) => el.textContent)
        .join(";  "),
    };
  });
}

function parseRelatedWords(lemmas: HtmlNode[]): LingueeDictionaryResult["relatedWords"] {
  return lemmas.map((lemma) => {
    const { word, pos } = parseHeadword(lemma);
    const [featured, unfeatured] = extractTranslations(lemma);
    return {
      expression: word,
      partOfSpeech: pos,
      meaning: [...featured, ...unfeatured]
        .map((item) => item.querySelector(".dictLink")?.textContent ?? "")
        .join(";  "),
    };
  });
}

function parseWikipediaItems(elements: HtmlNode[]): LingueeDictionaryResult["wikipedias"] {
  return elements.map((element) => {
    const h2Title = element.querySelector("h2");
    return {
      subject: h2Title?.textContent ?? "",
      text: h2Title?.nextSibling?.textContent?.trim() ?? "",
    };
  });
}

export function parseLingueeHTML(html: string): LingueeParseResult {
  const root = parse(html);
  const dictionary = root.querySelector("#dictionary");
  const exactLemmas = dictionary?.querySelectorAll(".exact .lemma") ?? [];
  const audioId = exactLemmas[0]?.querySelector(".tag_lemma")?.querySelector(".audio")?.getAttribute("id");

  const queryWord = root.querySelector(".l_deepl_ad__querytext");
  const sourceLanguage = getYoudaoLanguageId("sourceLang", root);
  const targetLanguage = getYoudaoLanguageId("targetLang", root);

  const wordItems = exactLemmas.map(parseWordItem);

  // Split inexact elements into examples vs related words by h3 label
  let examplesElement: HtmlNode[] = [];
  let relatedWordsElement: HtmlNode[] = [];
  for (const element of dictionary?.querySelectorAll(".inexact") ?? []) {
    const h3Text = element.querySelector("h3")?.textContent;
    const lemmas = element.querySelectorAll(".lemma");
    if (h3Text === "Examples:") {
      examplesElement = lemmas;
      continue;
    }
    if (h3Text === "See also:") {
      relatedWordsElement = lemmas;
      continue;
    }
  }

  const examples = parseExampleItems(examplesElement);
  const relatedWords = parseRelatedWords(relatedWordsElement);
  const wikipedias = parseWikipediaItems(dictionary?.querySelectorAll(".wikipedia .abstract") ?? []);

  const hasEntries = wordItems.length > 0 || examples.length > 0 || relatedWords.length > 0 || wikipedias.length > 0;
  if (!hasEntries) {
    logWarn("LingueeParse", "no entries found in Linguee dictionary");
  }

  const queryWordInfo: QueryWordInfo = {
    word: queryWord?.textContent ?? "",
    fromLanguage: sourceLanguage ?? "",
    toLanguage: targetLanguage ?? "",
    speechUrl: audioId ? `https://www.linguee.com/mp3/${audioId}.mp3` : "",
    isWord: hasEntries,
  };

  return {
    queryWordInfo,
    result: hasEntries ? { wordItems, examples, relatedWords, wikipedias } : undefined,
  };
}
