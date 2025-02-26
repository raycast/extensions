import { environment, AI, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { Citation, Author } from "./storage";

interface ExtractedCitationData {
  title: string;
  authors: Author[];
  publisher?: string;
  publicationDate?: string;
  type: "website" | "book" | "journal" | "newspaper" | "other";
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
}

export async function extractInformationFromUrl(url: string): Promise<ExtractedCitationData | null> {
  try {
    // First try to fetch the content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Check if AI is available
    if (environment.canAccess(AI)) {
      return extractWithAI(url, html);
    } else {
      // If AI is not available, extract basic info from meta tags
      return extractBasicInfo(url, html);
    }
  } catch (error) {
    console.error("Error extracting info from URL:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to extract information",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

async function extractWithAI(url: string, html: string): Promise<ExtractedCitationData | null> {
  const content = extractTextContent(html);
  const prompt = `
  I need to create an academic citation for the following webpage content.
  URL: ${url}
  
  Please extract the following information in JSON format to create a citation:
  1. title: The title of the content
  2. authors: Array of authors, each with firstName, lastName, and optional middleName
  3. publisher: The publisher or website name
  4. publicationDate: The publication date in YYYY-MM-DD format if available
  5. type: The type of content ("website", "book", "journal", "newspaper", "other")
  
  If it's an academic article, also extract:
  6. journalName: The name of the journal
  7. volume: Volume number
  8. issue: Issue number
  9. pages: Page range
  10. doi: Digital Object Identifier
  
  The first 10000 characters of the page content are:
  ${content.slice(0, 10000)}
  
  Return ONLY a valid JSON object without any markdown formatting or additional text.
  `;

  try {
    const aiResponse = await AI.ask(prompt, { model: AI.Model["Google_Gemini_2.0_Flash"] });
    const jsonMatch = aiResponse.match(/\{.*\}/s);

    if (jsonMatch) {
      try {
        // Try to parse the JSON
        const extractedData = JSON.parse(jsonMatch[0]);

        // Validate and normalize the data
        return {
          title: extractedData.title || "Untitled",
          authors: Array.isArray(extractedData.authors)
            ? extractedData.authors.map((author: { firstName: string; lastName: string; middleName: string }) => ({
                firstName: author.firstName || "",
                lastName: author.lastName || "",
                middleName: author.middleName,
              }))
            : [],
          publisher: extractedData.publisher,
          publicationDate: extractedData.publicationDate,
          type: ["website", "book", "journal", "newspaper", "other"].includes(extractedData.type)
            ? (extractedData.type as Citation["type"])
            : "website",
          journalName: extractedData.journalName,
          volume: extractedData.volume,
          issue: extractedData.issue,
          pages: extractedData.pages,
          doi: extractedData.doi,
        };
      } catch (e) {
        console.error("Error parsing JSON match:", e);
        // Try to parse the whole response as JSON
      }
    } else {
      // Try to parse the whole response as JSON
      try {
        const extractedData = JSON.parse(aiResponse);
        return {
          title: extractedData.title || "Untitled",
          authors: Array.isArray(extractedData.authors)
            ? extractedData.authors.map((author: { firstName: string; lastName: string; middleName: string }) => ({
                firstName: author.firstName || "",
                lastName: author.lastName || "",
                middleName: author.middleName,
              }))
            : [],
          publisher: extractedData.publisher,
          publicationDate: extractedData.publicationDate,
          type: ["website", "book", "journal", "newspaper", "other"].includes(extractedData.type)
            ? (extractedData.type as Citation["type"])
            : "website",
          journalName: extractedData.journalName,
          volume: extractedData.volume,
          issue: extractedData.issue,
          pages: extractedData.pages,
          doi: extractedData.doi,
        };
      } catch (e) {
        // If all else fails, fallback to basic extraction
        return extractBasicInfo(url, html);
      }
    }
    // Add return null here to fix the missing return statement
    return null;
  } catch (error) {
    console.error("AI extraction error:", error);
    // Fallback to basic info extraction
    return extractBasicInfo(url, html);
  }
}

function extractBasicInfo(url: string, html: string): ExtractedCitationData {
  // Create a very basic parser to extract meta tags
  const title = extractMetaTag(html, "title") || extractMetaProperty(html, "og:title") || extractUrlDomain(url);

  const publisher = extractMetaProperty(html, "og:site_name") || extractUrlDomain(url);

  const publishDate =
    extractMetaProperty(html, "article:published_time") ||
    extractMetaProperty(html, "og:published_time") ||
    extractMetaProperty(html, "publication_date");

  const authorString =
    extractMetaTag(html, "author") ||
    extractMetaProperty(html, "article:author") ||
    extractMetaProperty(html, "og:author");

  return {
    title: title || "Untitled",
    authors: parseAuthorString(authorString),
    publisher,
    publicationDate: publishDate,
    type: isDOIUrl(url) ? "journal" : "website",
    // DOI extraction if it's an academic URL
    doi: extractDOI(url, html),
  };
}

function extractTextContent(html: string): string {
  // Very simple HTML content extraction - removes scripts, styles, and HTML tags
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function extractMetaTag(html: string, name: string): string | undefined {
  const regex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i");
  const match = html.match(regex);
  return match ? match[1] : undefined;
}

function extractMetaProperty(html: string, property: string): string | undefined {
  const regex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']*)["']`, "i");
  const match = html.match(regex);
  return match ? match[1] : undefined;
}

function extractUrlDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return domain;
  } catch (e) {
    return "";
  }
}

function parseAuthorString(authorString?: string): Author[] {
  if (!authorString) return [];

  // Split by common separators
  const authors = authorString
    .split(/,|;|and/)
    .map((a) => a.trim())
    .filter(Boolean);

  return authors.map((author) => {
    // Try to split into first and last name
    const parts = author.split(/\\s+/);
    if (parts.length === 1) {
      return { firstName: "", lastName: parts[0] };
    } else if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] };
    } else {
      // Assume first name, middle name, last name format
      return {
        firstName: parts[0],
        middleName: parts.slice(1, parts.length - 1).join(" "),
        lastName: parts[parts.length - 1],
      };
    }
  });
}

function isDOIUrl(url: string): boolean {
  return url.includes("doi.org") || extractDOI(url, "") !== undefined;
}

function extractDOI(url: string, html: string): string | undefined {
  // Try to extract from URL first
  const doiUrlMatch = url.match(/doi\.org\/([^/&?#]+)/i);
  if (doiUrlMatch) return doiUrlMatch[1];

  // Try to find in HTML content
  const doiInHtmlMatch = html.match(/doi:([^<>"'\\s]+)/i) || html.match(/doi\.org\/([^<>"'\\s]+)/i);

  return doiInHtmlMatch ? doiInHtmlMatch[1] : undefined;
}
