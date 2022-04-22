import { URL, URLSearchParams } from "url";
import axios from "axios";
import * as cheerio from "cheerio";

export interface ReferenceSearchResult {
  url: string;
  passages: BiblePassage[];
  version: string;
  copyright: string;
}

interface BiblePassage {
  verses: string[];
  reference: string;
}

interface SearchOptions {
  includeVerseNumbers?: boolean;
}

export async function search(
  query: string,
  version: string,
  options?: SearchOptions,
  signal?: AbortSignal
): Promise<ReferenceSearchResult> {
  const url = createSearchUrl(query, version);
  const result = await axios.get(url.toString(), { signal });
  const { passages, version: fullVersion, copyright } = parsePassagesFromHtml(result.data, options);
  url.searchParams.delete("interface");
  return { version: fullVersion, passages, copyright, url: url.toString() };
}

function parsePassagesFromHtml(html: string, options?: SearchOptions) {
  const $ = cheerio.load(html);
  const version = $(".publisher-info-bottom strong").text();
  const copyright = $(".publisher-info-bottom p").first().text();
  const passages = $(".passage-cols")
    .map((_, passageEl) => {
      const reference = $(".bcv", passageEl).text();
      const verses = $("p .text", passageEl)
        .map((_, textClassEl) => {
          const verseNum = $("sup.versenum", textClassEl);
          const chapternum = $("span.chapternum", textClassEl);
          if (options?.includeVerseNumbers) {
            verseNum.replaceWith(`[${verseNum.text().trim()}] `);
            chapternum.replaceWith("[1] "); // chapter number replaces first verse number
          } else {
            verseNum.remove();
            chapternum.remove();
          }
          $("sup", textClassEl).remove(); // remove remaining sups like .footnotes and .crossreferences
          return $(textClassEl).text();
        })
        .toArray();
      return { verses, reference, version };
    })
    .toArray()
    .reduce((acc, passage) => {
      if (!acc.some((p) => p.reference === passage.reference)) {
        acc.push(passage);
      }
      return acc;
    }, [] as BiblePassage[]);
  return { passages, version, copyright };
}

function createSearchUrl(query: string, version: string): URL {
  const url = new URL("https://www.biblegateway.com/passage/");
  // print version loads twice as fast!
  url.search = new URLSearchParams({ search: query, version, interface: "print" }).toString();
  return url;
}
