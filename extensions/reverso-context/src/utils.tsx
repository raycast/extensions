import { LangCode, LangPair, UsageExample } from "./domain";
import LanguageDetect from "languagedetect";
import { getAlphabet } from "./alphabet";
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType("iso2");

export const reversoQuery = "https://context.reverso.net/bst-query-service";
export const reversoBrowserQuery = "https://context.reverso.net/translation";
const tTextRx = /<em>(.*?)<\/em>/g;
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

export function toMdBold(raw: string): string {
  return raw.replace(/<.*?>/g, "**");
}

export function buildTText(raw: string): string {
  const matches = raw.match(tTextRx)?.map(clearTag) || [];

  return matches.join(" ... ");
}

export function buildDetails(e: UsageExample): string {
  return (
    `- ${toMdBold(e.tExample)}\n` + `- ${toMdBold(e.sExample)}\n` + `---\n` + `> Source: [${e.source}](${e.sourceUrl})`
  );
}

export function prefsToLangPair(prefs: { langFrom: LangCode; langTo: LangCode }): LangPair {
  return { from: prefs.langFrom, to: prefs.langTo };
}

function fitsToAlphabet(text: string, language: LangCode): boolean {
  const alphabet = getAlphabet(language);

  return Array.from(text).every((c) => alphabet.includes(c));
}

export function clarifyLangPairDirection(text: string, langPair: LangPair): LangPair {
  // if input doesn't fit with 'from' alphabet, but fits with 'to', then we most likely need to revese pair
  if (!fitsToAlphabet(text, langPair.from) && fitsToAlphabet(text, langPair.to)) {
    return { from: langPair.to, to: langPair.from };
  }

  for (const langProb of lngDetector.detect(text)) {
    if (langProb[0] === langPair.from.toString()) {
      return langPair;
    }
    if (langProb[0] === langPair.to.toString()) {
      return { from: langPair.to, to: langPair.from };
    }
  }

  return langPair;
}
