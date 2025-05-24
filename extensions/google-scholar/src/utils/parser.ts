import * as cheerio from "cheerio";
import { SearchResult } from "../search-articles"; // Adjust path as needed

/**
 * Regex to identify if a string segment likely represents a domain name (e.g., publisher.com).
 * Used to avoid misinterpreting publisher links as publication venues.
 */
const DOMAIN_REGEX = /^([a-zA-Z0-9\-_]+\.)+[a-zA-Z]{2,}$/;

/**
 * Parses the HTML content of a Google Scholar search results page
 * to extract article information.
 *
 * @param html The HTML string of the search results page.
 * @returns An array of SearchResult objects.
 */
export function parseScholarHtmlResults(html: string): SearchResult[] {
  const $ = cheerio.load(html);
  const pageResults: SearchResult[] = [];

  $(".gs_ri").each((i, el) => {
    const titleElement = $(el).find(".gs_rt a");
    const title = titleElement.text() || "No title available";
    const link = titleElement.attr("href") || "";

    const metaInfoText = $(el).find(".gs_a").text(); // Full meta info string
    let authors = "Unknown";
    let publication = "Unknown";
    let year = "Not Found";

    try {
      let processedMetaInfo = metaInfoText;

      const yearMatch = processedMetaInfo.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch && yearMatch[0]) {
        year = yearMatch[0];
        processedMetaInfo = processedMetaInfo.replace(new RegExp(year, "g"), "").trim();
      }

      const metaParts = processedMetaInfo.split(" - ").map((part) => part.trim());

      if (metaParts.length > 0) {
        authors = metaParts[0].replace(/,\s*$/, "");
      }

      if (metaParts.length > 1) {
        const potentialPublication = metaParts[1].replace(/,\s*$/, "");
        if (!potentialPublication.match(DOMAIN_REGEX) && potentialPublication.length > 5) {
          publication = potentialPublication;
        } else if (metaParts.length > 2) {
          const thirdPartAsPublication = metaParts[2].replace(/,\s*$/, "");
          if (!thirdPartAsPublication.match(DOMAIN_REGEX) && thirdPartAsPublication.length > 5) {
            publication = thirdPartAsPublication;
          }
        }
      }
      if (publication === "Unknown" && authors !== "Unknown" && authors !== processedMetaInfo) {
        const remainingText = processedMetaInfo
          .substring(authors.length)
          .replace(/^\s*-\s*/, "")
          .trim();
        if (remainingText && !remainingText.match(DOMAIN_REGEX) && remainingText.length > 5) {
          publication = remainingText.split(" - ")[0].trim().replace(/,\s*$/, "");
        }
      }
    } catch (error) {
      console.error("Error parsing meta info:", metaInfoText, error);
    }

    const snippet = $(el).find(".gs_rs").text() || "No abstract available.";
    const pdfLinkElement = $(el)
      .find(".gs_fl a")
      .filter((i, a) => $(a).text().includes("[PDF]"));
    const pdfLink = pdfLinkElement.attr("href");
    const citationElement = $(el)
      .find(".gs_fl a")
      .filter((i, a) => $(a).text().includes("Cited by"));
    const citationText = citationElement.text();
    const citationCount = citationText?.match(/\d+/)?.[0] || "0";

    pageResults.push({
      title,
      link,
      authors,
      snippet,
      pdfLink,
      publication,
      year,
      citationCount,
    });
  });

  return pageResults;
}
