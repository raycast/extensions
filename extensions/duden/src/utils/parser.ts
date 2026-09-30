/**
 * HTML parsing utilities for Duden.de pages
 * Based on parsing patterns from the Python duden project
 */

import * as cheerio from "cheerio";
import { DudenWord, SearchResult } from "../types/duden";

/**
 * Clear text by removing soft hyphens and extra whitespace
 */
function clearText(text: string): string {
  return text.replace(/\xad/g, "").trim();
}

/**
 * Parse a word detail page HTML into a DudenWord object
 */
export function parseWordDetails(html: string): DudenWord | null {
  const $ = cheerio.load(html);

  try {
    // Extract title (word with article)
    const titleElement = $("h1").first();
    if (titleElement.length === 0) return null;

    const title = clearText(titleElement.text());

    // Extract word name (without article)
    let name = title;
    const nameElement = $("span.lemma__main").first();
    if (nameElement.length > 0) {
      name = clearText(nameElement.text());
    } else if (title.includes(", ")) {
      // Fallback: split title by comma for nouns
      name = title.split(", ")[0];
    }

    // Extract article
    let article: string | undefined;
    const articleElement = $("span.lemma__determiner").first();
    if (articleElement.length > 0) {
      article = clearText(articleElement.text());
    } else if (title.includes(", ")) {
      // Fallback: get article from title
      const parts = title.split(", ");
      if (parts.length > 1) {
        article = parts[1];
      }
    }

    // Extract URL name from canonical link
    let urlname = name.toLowerCase();
    const canonicalLink = $('link[rel="canonical"]').first();
    if (canonicalLink.length > 0) {
      const href = canonicalLink.attr("href");
      if (href) {
        urlname = href.split("/").pop() || urlname;
      }
    }

    // Helper function to find tuple dl elements
    const findTupleDl = (key: string, container?: cheerio.Cheerio): cheerio.Cheerio | null => {
      const searchIn = container || $("article").first();
      const dls = searchIn.find("dl.tuple");

      for (let i = 0; i < dls.length; i++) {
        const dl = dls.eq(i);
        const label = dl.find("dt.tuple__key").first();
        if (label.text().includes(key)) {
          return dl.find("dd.tuple__val").first();
        }
      }
      return null;
    };

    // Extract part of speech
    let partOfSpeech: string | undefined;
    const posElement = findTupleDl("Wortart");
    if (posElement) {
      partOfSpeech = posElement.text().trim();
    }

    // Extract frequency (count filled bars)
    let frequency: number | undefined;
    const freqElement = $("span.shaft__full").first();
    if (freqElement.length > 0) {
      frequency = freqElement.text().length;
    }

    // Extract usage context
    let usage: string | undefined;
    const usageElement = findTupleDl("Gebrauch");
    if (usageElement) {
      usage = usageElement.text().trim();
    }

    // Extract word separation
    let wordSeparation: string[] | undefined;
    const rechtschreibungDiv = $("#rechtschreibung").first();
    if (rechtschreibungDiv.length > 0) {
      const sepElement = findTupleDl("Worttrennung", rechtschreibungDiv);
      if (sepElement) {
        wordSeparation = sepElement
          .text()
          .split("|")
          .map((s) => s.trim());
      }
    }

    // Extract meaning overview
    let meaningOverview: string | undefined;
    const bedeutungDiv = $("#bedeutung, #bedeutungen").first();
    if (bedeutungDiv.length > 0) {
      // Clone and clean up the element
      const cleanDiv = bedeutungDiv.clone();
      cleanDiv.find("header").remove();
      cleanDiv.find("dl.note").remove(); // Remove examples
      cleanDiv.find("dl.tuple").each((_, el) => {
        const dt = $(el).find("dt").first().text();
        if (dt.includes("Grammatik") || dt.includes("Gebrauch")) {
          $(el).remove();
        }
      });
      cleanDiv.find("figure").remove(); // Remove pictures

      meaningOverview = cleanDiv.text().trim();
    }

    // Extract synonyms
    let synonyms: string | undefined;
    const synonymeDiv = $("#synonyme").first();
    if (synonymeDiv.length > 0) {
      const cleanDiv = synonymeDiv.clone();
      cleanDiv.find("header").remove();
      cleanDiv.find("nav.more").remove();
      synonyms = cleanDiv.text().trim();
    }

    // Extract origin
    let origin: string | undefined;
    const herkunftDiv = $("#herkunft").first();
    if (herkunftDiv.length > 0) {
      const cleanDiv = herkunftDiv.clone();
      cleanDiv.find("header").remove();
      origin = cleanDiv.text().trim();
    }

    // Extract phonetic notation
    let phonetic: string | undefined;
    const ipaElement = $("span.ipa").first();
    if (ipaElement.length > 0) {
      phonetic = ipaElement.text().trim();
    }

    // Extract alternative spellings
    let alternativeSpellings: string[] | undefined;
    const altSpellings = $("span.lemma__alt-spelling");
    if (altSpellings.length > 0) {
      alternativeSpellings = altSpellings.map((_, el) => $(el).text().trim()).get();
    }

    // Extract examples
    let examples: string | undefined;
    if (bedeutungDiv.length > 0) {
      const exampleElements = bedeutungDiv.find("dl.note");
      if (exampleElements.length > 0) {
        const exampleTexts = exampleElements
          .map((_, el) => {
            let text = $(el).text().trim();
            // Remove "Beispiel(e)" headers
            text = text.replace(/^Beispiele?/, "").trim();
            return text;
          })
          .get();
        examples = exampleTexts.join("\n");
      }
    }

    return {
      name,
      title,
      urlname,
      article,
      partOfSpeech,
      frequency,
      usage,
      wordSeparation,
      meaningOverview,
      origin,
      synonyms,
      phonetic,
      alternativeSpellings,
      examples,
    };
  } catch {
    return null;
  }
}

/**
 * Parse search results page HTML into an array of SearchResult objects
 */
export function parseSearchResults(html: string): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  try {
    const definitions = $("h2.vignette__title");

    definitions.each((_, element) => {
      const titleElement = $(element);
      const linkElement = titleElement.find("a").first();

      if (linkElement.length > 0) {
        const href = linkElement.attr("href");
        if (href) {
          const urlname = href.split("/").pop();
          const titleText = clearText(titleElement.text());

          if (urlname && titleText) {
            // Extract name and part of speech from title
            // Title format is usually "Word, article (part of speech)" or just "Word"
            let name = titleText;
            let partOfSpeech: string | undefined;

            // Try to extract part of speech from parentheses
            const parenMatch = titleText.match(/\(([^)]+)\)$/);
            if (parenMatch) {
              partOfSpeech = parenMatch[1];
              name = titleText.replace(/\s*\([^)]+\)$/, "");
            }

            // If name still contains comma, take the part before comma
            if (name.includes(", ")) {
              name = name.split(", ")[0];
            }

            results.push({
              name,
              urlname,
              partOfSpeech,
            });
          }
        }
      }
    });
  } catch {
    // Silently ignore parsing errors
  }

  return results;
}
