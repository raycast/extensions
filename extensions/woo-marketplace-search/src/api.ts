import { AlgoliaMultiResponse, WooProduct, WooDoc } from "./types";

// Algolia credentials (public, embedded in WooCommerce.com frontend)
const ALGOLIA_APP_ID = "EWMLW36CPJ";
const ALGOLIA_API_KEY = "5c96947060b5e467ba415d8300d18057"; // Public search-only key
const ALGOLIA_BASE_URL = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;

// Index names for WooCommerce.com (discovered from wccom-components.min.js)
const PRODUCTS_INDEX = "WooThemes.com-product";
const POSTS_INDEX = "WooThemes.com-post";

interface AlgoliaRequest {
  indexName: string;
  query: string;
  params?: string;
}

async function searchAlgolia<T>(
  requests: AlgoliaRequest[],
): Promise<AlgoliaMultiResponse<T>> {
  const response = await fetch(ALGOLIA_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_API_KEY,
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    throw new Error(`Algolia search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function searchExtensions(query: string): Promise<WooProduct[]> {
  if (!query.trim()) {
    return [];
  }

  const result = await searchAlgolia<WooProduct>([
    {
      indexName: PRODUCTS_INDEX,
      query: query,
      params: "hitsPerPage=20",
    },
  ]);

  return result.results[0]?.hits || [];
}

export async function searchDocs(query: string): Promise<WooDoc[]> {
  if (!query.trim()) {
    return [];
  }

  const result = await searchAlgolia<WooDoc>([
    {
      indexName: POSTS_INDEX,
      query: query,
      params: "hitsPerPage=20",
    },
  ]);

  return result.results[0]?.hits || [];
}

// Decode HTML entities (&#8211; -> en-dash, &amp; -> &, etc.)
export function decodeHtmlEntities(text: string | undefined): string {
  if (!text) return "";

  // Common HTML entities
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&nbsp;": " ",
    "&ndash;": "\u2013",
    "&mdash;": "\u2014",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&hellip;": "\u2026",
    "&copy;": "\u00A9",
    "&reg;": "\u00AE",
    "&trade;": "\u2122",
  };

  let result = text;

  // Replace named entities
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }

  // Replace numeric entities (&#8211; -> en-dash)
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );

  // Replace hex entities (&#x2013; -> en-dash)
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return result;
}

// Helper to get localized value (fallback to en_US) with HTML entity decoding
export function getLocalizedValue(
  obj: Record<string, string> | string | undefined,
  lang = "en_US",
): string {
  if (!obj) return "";
  const value =
    typeof obj === "string"
      ? obj
      : obj[lang] || obj["en_US"] || Object.values(obj)[0] || "";
  return decodeHtmlEntities(value);
}

// Format price for display
export function formatPrice(price: number | string | undefined): string {
  if (!price) return "";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "";
  return `$${num.toFixed(0)}/year`;
}

// Format rating stars
export function formatRating(
  rating: number | string | undefined,
  count: number | undefined,
): string {
  if (!rating) return "";
  const num = typeof rating === "string" ? parseFloat(rating) : rating;
  if (isNaN(num)) return "";
  const stars =
    "\u2605".repeat(Math.round(num)) + "\u2606".repeat(5 - Math.round(num));
  return count ? `${stars} (${count})` : stars;
}

// Strip HTML tags from text
export function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, "").trim());
}
