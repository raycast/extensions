import { Cache } from "@raycast/api";
import * as cheerio from "cheerio";

const cache = new Cache({
  namespace: "translation",
});

async function getHTML(word: string): Promise<cheerio.CheerioAPI> {
  const response = await fetch(`https://tureng.com/en/turkish-english/${word}`).then((r) => r.text());

  const html = cheerio.load(response);
  return html;
}

export async function getTranslations(word: string): Promise<string[]> {
  if (cache.has(word)) {
    return JSON.parse(cache.get(word)!);
  }

  const html = await getHTML(word);

  const translationsTable = html("#englishResultsTable").first();

  const translations: string[] = [];

  translationsTable.find("tr").each((_, el) => {
    const elements = html(el).find("td[lang='en'] a, td[lang='tr'] a");
    if (elements.length === 0) return;

    elements.each((_, trEl) => {
      const text = html(trEl).text().trim();
      if (text.length > 0 && text !== word) {
        translations.push(text);
      }
    });
  });

  const returnArray = Array.from(new Set(translations)).splice(0, 3);
  cache.set(word, JSON.stringify(returnArray));

  return returnArray;
}
