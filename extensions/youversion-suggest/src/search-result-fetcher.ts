import cheerio from "cheerio";
import { getPreferredLanguage, getPreferredVersion } from "./preferences";
import { BibleReference } from "./types";
import { baseSearchUrl, buildBibleReferenceFromID, fetchHTML, getBibleData, getReferenceIDFromURL } from "./utilities";

// Fetch the textual content of the given Bible reference; returns a promise
export async function searchBibleForPhrase(searchText: string) {
  const preferredVersionId = await getPreferredVersion();
  const html = await fetchHTML(`${baseSearchUrl}?q=${encodeURIComponent(searchText)}&version_id=${preferredVersionId}`);
  const references = parseContentFromHTML(html);
  return references;
}

export async function parseContentFromHTML(html: string): Promise<BibleReference[]> {
  const $ = cheerio.load(html);
  const $references = $("li.reference");

  const bible = await getBibleData(await getPreferredLanguage());

  const results: BibleReference[] = [];
  $references.each((r, referenceElem) => {
    const $reference = $(referenceElem);
    const reference = buildBibleReferenceFromID(getReferenceIDFromURL($reference.find("a").prop("href")), bible);
    reference.content = $reference.find("p").text().trim();
    if (reference) {
      results.push(reference);
    }
  });
  return results;
}
