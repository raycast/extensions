import { LangCode, LangPair, Translation } from "./domain";
import LanguageDetect from "languagedetect";
import { getAlphabet } from "./alphabet";
import { Color } from "@raycast/api";
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType("iso2");

export const codeToLanguageDict: Record<LangCode, string> = {
  ["ru"]: "russian",
  ["en"]: "english",
  ["de"]: "german",
  ["ar"]: "arabic",
  ["es"]: "spanish",
  ["fr"]: "french",
  ["he"]: "hebrew",
  ["it"]: "italian",
  ["ja"]: "japanese",
  ["nl"]: "dutch",
  ["pl"]: "polish",
  ["pt"]: "portuguese",
  ["ro"]: "romanian",
  ["sv"]: "swedish",
  ["tr"]: "turkish",
  ["uk"]: "ukrainian",
  ["zh"]: "chinese",
};

export function clearTag(raw: string): string {
  return raw.replace(/<.*?>/g, "");
}

export function prefsToLangPair(prefs: { langFrom: LangCode; langTo: LangCode }): LangPair {
  return { from: prefs.langFrom, to: prefs.langTo };
}

function fitsToAlphabet(text: string, language: LangCode): boolean {
  const alphabet = getAlphabet(language);
  return Array.from(text).every((c) => alphabet.includes(c));
}

export function clarifyLangPairDirection(text: string, langPair: LangPair): [LangPair, string] {
  const langPattern = /^([a-z]{2})?>([a-z]{2})?\s/;
  const match = text.match(langPattern);
  let updatedLangPair = langPair;

  if (match) {
    const [, fromLang, toLang] = match;

    if (fromLang && Object.keys(codeToLanguageDict).includes(fromLang)) {
      updatedLangPair = { ...updatedLangPair, from: fromLang as LangCode };
    }
    if (toLang && Object.keys(codeToLanguageDict).includes(toLang)) {
      updatedLangPair = { ...updatedLangPair, to: toLang as LangCode };
    }

    text = text.slice(match[0].length); // Remove detected pattern from text
  }

  // If input doesn't fit 'from' alphabet but fits 'to', reverse the pair
  if (!fitsToAlphabet(text, updatedLangPair.from) && fitsToAlphabet(text, updatedLangPair.to)) {
    updatedLangPair = { from: updatedLangPair.to, to: updatedLangPair.from };
  }

  for (const [detectedLang] of lngDetector.detect(text)) {
    if (detectedLang === updatedLangPair.from.toString()) {
      return [updatedLangPair, text];
    }
    if (detectedLang === updatedLangPair.to.toString()) {
      return [{ from: updatedLangPair.to, to: updatedLangPair.from }, text];
    }
  }

  return [updatedLangPair, text];
}

export const posToColor: Record<string, Color> = {
  n: Color.Blue,
  v: Color.Green,
  adj: Color.Yellow,
  adv: Color.Orange,
  "": Color.SecondaryText,
};

export const posToPosName: Record<string, string> = {
  n: "Noun",
  v: "Verb",
  adj: "Adjective",
  adv: "Adverb",
  "": "Unknown",
};

// color of tags based on their pos. return array of tags with their color
export const translationsToAccessoryTags = (
  translations: Translation[],
  limit: number | boolean,
): { tag: { value: string; color: string } }[] => {
  // slice the translations array such that the sum of characters of all `translations` is greater than `limit`
  // where also, each item is considered as 3 characters because of the space between them

  if (typeof limit === "number") {
    let totalChars = 0;
    let i;
    for (i = 0; i < translations.length && totalChars < limit; i++) {
      totalChars += translations[i].translation.length + 3;
    }
    translations = translations.slice(0, i);
  }

  const accessories = [];
  for (let i = 0; i < translations.length; i++) {
    let color;
    if (translations[i].pos in posToColor) {
      color = posToColor[translations[i].pos];
    } else {
      color = Color.SecondaryText;
    }
    accessories.push({
      tag: {
        value: translations[i].translation,
        color: color,
      },
    });
  }
  return accessories;
};

// return array of (pos=string, translations=array of translations, color=color of pos) objects
export const translationsToMetadataTagList = (
  translations: Translation[],
): { pos: string; translations: Translation[]; color: Color }[] => {
  const metadataTagList = [];
  for (const pos of Array.from(new Set(translations.map((t) => t.pos))) as string[]) {
    const color = pos in posToColor ? posToColor[pos] : Color.SecondaryText;
    metadataTagList.push({
      pos: posToPosName[pos],
      translations: translations.filter((t) => t.pos === pos),
      color: color,
    });
  }
  // sort by pos name, so that the order is Noun, Verb, Adjective, Adverb
  metadataTagList.sort((a, b) => {
    const posA = posToPosName[a.pos] || "Unknown";
    const posB = posToPosName[b.pos] || "Unknown";
    return posA.localeCompare(posB);
  });
  return metadataTagList;
};
