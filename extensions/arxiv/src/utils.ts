import xml2js from "xml2js";
import { SearchResult } from "./types";

declare module "xml2js";

export async function parseResponse(response: Response): Promise<SearchResult[]> {
  const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: true });

  // Read the body content as a string
  const xml = await response.text();

  // Parse the XML string
  return parser.parseStringPromise(xml).then((result: any) => {
    if (result.feed.entry) {
      return result.feed.entry.map((entry: any) => {
        let pdfLink = "";
        let categories = "";
        let published = "";

        // Check link is not undefined
        if (entry.link) {
          const pdfLinkElement = entry.link.find(
            (link: any) =>
              link && link.rel && link.rel[0] === "related" && link.type && link.type[0] === "application/pdf"
          );
          if (pdfLinkElement && pdfLinkElement.href) {
            pdfLink = pdfLinkElement.href[0];
          }
        }

        // Check category is not undefined
        if (entry.category) {
          if (Array.isArray(entry.category)) {
            categories = entry.category.map((category: any) => category.term).join(", ");
          } else {
            categories = entry.category.term;
          }
        }

        // Check published is not undefined
        if (entry.published) {
          published = entry.published[0];
        } else {
          published = "";
        }

        return {
          id: entry.id,
          published: published,
          title: entry.title,
          authors: entry.author.map((a: any) => a.name),
          category: categories,
          link: pdfLink,
        };
      });
    } else {
      return [];
    }
  });
}
