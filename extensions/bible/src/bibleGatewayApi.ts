import { URL, URLSearchParams } from "url";
import * as cheerio from "cheerio";

export interface ReferenceSearchResult {
  url: URL;
  passages: BiblePassage[];
  version: string;
  copyright: string;
}

interface BiblePassage {
  verses: Verse[];
  reference: string;
}

interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export async function search(query: string, version: string): Promise<ReferenceSearchResult> {
  const url = createSearchUrl(query, version);
  const result = await fetch(url, { headers: { accept: "text/html" } });
  const { passages, version: fullVersion, copyright } = parsePassagesFromHtml(await result.text());
  url.searchParams.delete("interface");
  return { version: fullVersion, passages, copyright, url };
}

function parsePassagesFromHtml(html: string) {
  const $ = cheerio.load(html);
  const version = $(".publisher-info-bottom strong").text();
  const copyright = $(".publisher-info-bottom p").first().text();
  const passages: BiblePassage[] = $(".passage-table")
    .map((_, passageEl) => {
      const reference = $(".bcv", passageEl).text();
      let lastVerse = NaN;
      let lastChapter = NaN;
      const verses = $("p .text", passageEl)
        .map((_, textClassEl): Verse => {
          // Chapter is only specified at the start of a new chapter,
          // and only for some versions.
          const chapterEl = $("span.chapternum", textClassEl);
          let chapter = parseInt(chapterEl.text());
          if (chapter) lastVerse = 1; // reset verse number for new chapter
          chapter = chapter || lastChapter; // use last chapter if chapter number is missing
          lastChapter = chapter;

          // Verse won't be present for every verse (e.g. poetry, or first verse of chapter)
          const verseEl = $("sup.versenum", textClassEl);
          const verse = parseInt(verseEl.text()) || lastVerse;
          lastVerse = verse;

          // Remove everything that is not part of the verse text before getting the text
          chapterEl.remove();
          verseEl.remove();
          $("sup", textClassEl).remove();

          const text = $(textClassEl).text().trim();
          return { chapter, verse, text };
        })
        .toArray();

      // The `verses` array might have multiple entries that belong to the same verse.
      // We need to combine consecutive verse entries that have the same verse number.
      const combinedVerses: Verse[] = [];
      for (const verse of verses) {
        const lastCombinedVerse = combinedVerses[combinedVerses.length - 1];
        if (lastCombinedVerse && lastCombinedVerse.verse === verse.verse) {
          lastCombinedVerse.text += ` ${verse.text}`;
        } else {
          combinedVerses.push(verse);
        }
      }

      return { verses: combinedVerses, reference, version };
    })
    .toArray()
    .reduce((acc: BiblePassage[], passage: BiblePassage) => {
      // Deduplicate passages by reference
      if (!acc.some((p) => p.reference === passage.reference)) {
        acc.push(passage);
      }
      return acc;
    }, []);
  return { passages, version, copyright };
}

function createSearchUrl(query: string, version: string): URL {
  const url = new URL("https://www.biblegateway.com/passage/");
  // print version loads twice as fast!
  url.search = new URLSearchParams({ search: query, version, interface: "print" }).toString();
  return url;
}
