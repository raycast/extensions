import { getPreferenceValues } from "@raycast/api";
import Exa, { type AnswerResponse, type SearchResponse, type Status } from "exa-js";

export const SEARCH_CATEGORIES = [
  "company",
  "people",
  "research paper",
  "news",
  "personal site",
  "financial report",
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];
export type ContentMode = "text" | "highlights";
export type CodeContextTokens = "dynamic" | number;

export type SearchToolInput = {
  query: string;
  numResults?: number;
  category?: SearchCategory;
  includeDomains?: string[];
  excludeDomains?: string[];
};

export type CompactSearchResult = {
  title: string;
  url: string;
  domain: string;
  highlights: string[];
  publishedDate?: string;
  author?: string;
  favicon?: string;
};

export type CompactCitation = {
  title: string;
  url: string;
  publishedDate?: string;
};

export type CompactStatus = Pick<Status, "id" | "status" | "source">;

export type CodeContextResponse = {
  query: string;
  response: string;
  requestId?: string;
  resultsCount?: number;
  outputTokens?: number;
  searchTime?: number;
};

type SearchHighlightsResponse = SearchResponse<{ highlights: true }>;
type SearchTextResponse = SearchResponse<{ text: true }>;
type SearchResultWithText = SearchTextResponse["results"][number];
type SearchResultWithHighlights = SearchHighlightsResponse["results"][number];

const preferences: ExtensionPreferences = getPreferenceValues();
const exaBaseUrl = !preferences.apiKey ? "https://extensions-api-proxy.raycast.com/exa" : "https://api.exa.ai";
const exa = new Exa(preferences.apiKey || "no-api-key", exaBaseUrl);
(exa as unknown as { headers?: Headers }).headers?.set("x-exa-integration", "raycast-exa");

function isCodeContextResponse(value: unknown): value is CodeContextResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.query === "string" && typeof candidate.response === "string";
}

function cleanArray(values?: string[]) {
  const cleaned = values?.map((value) => value.trim()).filter(Boolean);
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function fallbackTitle(url: string) {
  return getHostname(url);
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getExaSearchUrl(query?: string) {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return "https://exa.ai/search";
  }

  return `https://exa.ai/search?q=${encodeURIComponent(trimmedQuery)}`;
}

export function formatExaError(error: unknown) {
  const fallback = "Something went wrong while talking to Exa.";

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.includes("Failed to fetch from Exa API")) {
      return preferences.apiKey
        ? "Failed to reach the Exa API. Check your internet connection and verify your API key is valid."
        : "Failed to reach Exa through the Raycast proxy. Add your Exa API key in extension preferences or try again later.";
    }
    return message || fallback;
  }

  if (typeof error === "string") {
    if (error.includes("Failed to fetch from Exa API")) {
      return preferences.apiKey
        ? "Failed to reach the Exa API. Check your internet connection and verify your API key is valid."
        : "Failed to reach Exa through the Raycast proxy. Add your Exa API key in extension preferences or try again later.";
    }
    return error;
  }

  return fallback;
}

export function compactStatuses(statuses?: Status[]): CompactStatus[] | undefined {
  return statuses?.map(({ id, status, source }) => ({ id, status, source }));
}

export async function searchHighlights(input: SearchToolInput) {
  const { query, numResults, category, includeDomains, excludeDomains } = input;

  return exa.search(query, {
    type: "auto",
    numResults,
    category,
    includeDomains: cleanArray(includeDomains),
    excludeDomains: cleanArray(excludeDomains),
    contents: {
      highlights: true,
    },
  });
}

export async function searchDeepReasoning(input: SearchToolInput) {
  const { query, numResults, category, includeDomains, excludeDomains } = input;

  return exa.search(query, {
    type: "deep-reasoning",
    numResults,
    category,
    includeDomains: cleanArray(includeDomains),
    excludeDomains: cleanArray(excludeDomains),
    contents: {
      highlights: true,
    },
  });
}

export function compactSearchResults(response: SearchHighlightsResponse): CompactSearchResult[] {
  return response.results.map((result) => ({
    title: result.title ?? fallbackTitle(result.url),
    url: result.url,
    domain: getHostname(result.url),
    highlights: result.highlights ?? [],
    publishedDate: result.publishedDate,
    author: result.author,
    favicon: result.favicon,
  }));
}

export async function getGroundedAnswer(query: string) {
  return exa.answer(query, { model: "exa" });
}

export function streamGroundedAnswer(query: string) {
  return exa.streamAnswer(query, { model: "exa" });
}

export function compactAnswerResponse(response: AnswerResponse) {
  return {
    answer: typeof response.answer === "string" ? response.answer : JSON.stringify(response.answer, null, 2),
    citations: response.citations.map((citation) => ({
      title: citation.title ?? fallbackTitle(citation.url),
      url: citation.url,
      publishedDate: citation.publishedDate,
    })),
    requestId: response.requestId,
  };
}

export async function getPageContents(urls: string[], mode: "text"): Promise<SearchTextResponse>;
export async function getPageContents(urls: string[], mode: "highlights"): Promise<SearchHighlightsResponse>;
export async function getPageContents(urls: string[], mode: ContentMode = "highlights") {
  const cleanedUrls = urls.map((url) => url.trim()).filter(Boolean);
  if (cleanedUrls.length === 0) {
    throw new Error("Must provide at least one URL.");
  }

  if (mode === "highlights") {
    return exa.getContents(cleanedUrls, { highlights: true });
  }

  return exa.getContents(cleanedUrls, { text: true });
}

export function compactTextContentsResponse(response: SearchTextResponse) {
  return {
    results: response.results.map((result: SearchResultWithText) => ({
      title: result.title ?? fallbackTitle(result.url),
      url: result.url,
      text: result.text,
    })),
    statuses: compactStatuses(response.statuses),
  };
}

export function compactHighlightContentsResponse(response: SearchHighlightsResponse) {
  return {
    results: response.results.map((result: SearchResultWithHighlights) => ({
      title: result.title ?? fallbackTitle(result.url),
      url: result.url,
      highlights: result.highlights ?? [],
    })),
    statuses: compactStatuses(response.statuses),
  };
}

export async function getCodeContext(query: string, tokensNum: CodeContextTokens = "dynamic") {
  const response = await fetch(`${exaBaseUrl}/context`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": preferences.apiKey || "no-api-key",
      "x-exa-integration": "raycast-exa",
    },
    body: JSON.stringify({
      query,
      tokensNum,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data: unknown = await response.json();
  if (!isCodeContextResponse(data)) {
    throw new Error("Unexpected response shape from Exa context endpoint.");
  }

  return data;
}

export default exa;
