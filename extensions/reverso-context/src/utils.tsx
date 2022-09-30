import { LangCode, UsageExample } from "./domain";

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
