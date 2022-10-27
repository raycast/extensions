import { LangCode, LangPair, UsageExample } from "./domain";
import LanguageDetect from "languagedetect";
const lngDetector = new LanguageDetect();
lngDetector.setLanguageType("iso2");

export const reversoQuery = "https://context.reverso.net/bst-query-service";
export const reversoBrowserQuery = "https://context.reverso.net/translation";
const tTextRx = /<em>(.*?)<\/em>/g;
export const codeToLanguageDict: { [id: string]: string } = {
  [LangCode.RU]: "russian",
  [LangCode.EN]: "english",
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

export function clarifyLangPairDirection(text: string, langPair: LangPair): LangPair {
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
