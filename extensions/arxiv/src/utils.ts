import xml2js from "xml2js";
import { SearchResult } from "./types";
import { showFailureToast } from "@raycast/utils";

declare module "xml2js";

// Type definitions for arXiv XML response structure
interface ArxivLink {
  rel?: string[];
  type?: string[];
  href?: string[];
}

interface ArxivCategory {
  term: string;
}

interface ArxivAuthor {
  name?: string[];
}

interface ArxivEntry {
  id: string[];
  published?: string[];
  updated?: string[];
  title: string[];
  summary?: string[];
  author?: ArxivAuthor[];
  category?: ArxivCategory | ArxivCategory[];
  link?: ArxivLink[];
  "arxiv:doi"?: Array<{ _: string }>;
  "arxiv:comment"?: Array<{ _: string }>;
  "arxiv:journal_ref"?: Array<{ _: string }>;
}

interface ArxivFeed {
  entry?: ArxivEntry[];
}

interface ArxivResponse {
  feed?: ArxivFeed;
}

export class ArxivParseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "ArxivParseError";
  }
}

// Validate arXiv ID to prevent injection attacks
function validateArxivId(id: string): string {
  // arXiv IDs have specific formats:
  // New format: YYMM.NNNNN or YYMM.NNNNNvN (e.g., 2301.12345, 2301.12345v2)
  // Old format: category/YYMMNNN (e.g., math.GT/0605123)
  const newFormatRegex = /^\d{4}\.\d{4,5}(v\d+)?$/;
  const oldFormatRegex = /^[a-z-]+(\.\w+)?[/]\d{7}(v\d+)?$/i;

  if (newFormatRegex.test(id) || oldFormatRegex.test(id)) {
    return id;
  }

  // If the ID doesn't match expected patterns, sanitize it to prevent injection
  // Remove any characters that could be used for path traversal or URL manipulation
  let sanitized = id.replace(/[^a-zA-Z0-9./-]/g, "");

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\.\//g, "");
  sanitized = sanitized.replace(/\.\./g, "");

  return sanitized;
}

export async function parseResponse(response: Response): Promise<SearchResult[]> {
  const parser = new xml2js.Parser({
    explicitArray: true,
    mergeAttrs: true,
  });

  try {
    // Check response status
    if (!response.ok) {
      const errorMessage = `arXiv API error: ${response.status} ${response.statusText}`;
      console.error(errorMessage);
      await showFailureToast("Search Failed", {
        message: "Unable to connect to arXiv. Please try again later.",
      });
      throw new ArxivParseError(errorMessage);
    }

    // Read the body content as a string
    const xml = await response.text();

    // Check if we got an empty response
    if (!xml || xml.trim().length === 0) {
      console.warn("Empty response from arXiv API");
      return [];
    }

    // Parse the XML string
    return await parser.parseStringPromise(xml).then(async (result: ArxivResponse) => {
      // Check if result and result.feed exist
      if (!result || !result.feed) {
        console.error("Invalid XML structure: missing feed", result);
        await showFailureToast("Parse Error", {
          message: "Received invalid data from arXiv. Please try again.",
        });
        throw new ArxivParseError("Invalid XML structure: missing feed element");
      }

      // If there are no entries, return empty array (this is normal for empty search results)
      if (!result.feed.entry) {
        return [];
      }

      return result.feed.entry.map((entry: ArxivEntry) => {
        // Extract PDF link
        const pdfLinkElement = entry.link?.find(
          (link: ArxivLink) => link?.rel?.[0] === "related" && link?.type?.[0] === "application/pdf"
        );
        const pdfLink = pdfLinkElement?.href?.[0] ?? "";

        // Extract categories
        const categories = Array.isArray(entry.category)
          ? entry.category.map((category: ArxivCategory) => category.term).join(", ")
          : entry.category?.term ?? "";

        // Extract metadata fields
        const published = entry.published?.[0] ?? "";
        const updated = entry.updated?.[0] ?? "";
        const summary = entry.summary?.[0]?.replace(/\n/g, " ").trim() ?? "";
        const doi = entry["arxiv:doi"]?.[0]?._ ?? "";
        const comment = entry["arxiv:comment"]?.[0]?._ ?? "";
        const journalRef = entry["arxiv:journal_ref"]?.[0]?._ ?? "";

        // Extract the arXiv ID from the full ID URL
        const rawArxivId = entry.id[0].split("/abs/")[1] || entry.id[0];
        const arxivId = validateArxivId(rawArxivId);

        // Build URLs based on validated arXiv ID
        const abstractUrl = `https://arxiv.org/abs/${arxivId}`;
        const texUrl = `https://arxiv.org/e-print/${arxivId}`;
        const htmlUrl = `https://ar5iv.org/abs/${arxivId}`;

        return {
          id: entry.id?.[0] ?? "",
          published,
          updated: updated || undefined,
          title: entry.title?.[0] ?? "",
          summary: summary || undefined,
          authors: entry.author?.map((a: ArxivAuthor) => a.name?.[0] ?? "Unknown") ?? [],
          category: categories,
          link: pdfLink,
          abstractUrl,
          pdfUrl: pdfLink,
          texUrl,
          htmlUrl,
          doi: doi || undefined,
          comment: comment || undefined,
          journalRef: journalRef || undefined,
        };
      });
    });
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof ArxivParseError) {
      throw error;
    }

    // Log the error for debugging
    console.error("Error parsing arXiv XML response:", error);

    // Show user-friendly error message
    await showFailureToast("Search Error", {
      message: "Failed to process search results. Please try again.",
    });

    // Throw a wrapped error to allow proper error handling upstream
    throw new ArxivParseError("Failed to parse arXiv response", error);
  }
}
