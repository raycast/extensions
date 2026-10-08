import { GrokipediaValidationError } from "./errors";
import { Citation, PageResponse, SearchResponse } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCount(value: unknown): number | undefined {
  const count = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

function cleanTitle(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function parseSearchResponse(data: unknown): SearchResponse {
  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new GrokipediaValidationError("Grokipedia returned invalid search results. Try again.");
  }
  const results = data.results.map((result: unknown) => {
    if (
      !isRecord(result) ||
      typeof result.slug !== "string" ||
      !result.slug.trim() ||
      typeof result.title !== "string" ||
      !cleanTitle(result.title)
    ) {
      throw new GrokipediaValidationError("Grokipedia returned an invalid search result. Try again.");
    }
    return {
      slug: result.slug,
      title: cleanTitle(result.title),
      snippet: typeof result.snippet === "string" ? cleanTitle(result.snippet) : "",
      viewCount: parseCount(result.viewCount),
    };
  });
  return { results, totalCount: parseCount(data.totalCount) };
}

function parseCitations(data: unknown): Citation[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((citation: unknown, index) => {
    if (!isRecord(citation) || typeof citation.url !== "string") return [];
    try {
      const url = new URL(citation.url);
      if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    } catch {
      return [];
    }
    return [
      {
        id: typeof citation.id === "string" ? citation.id : String(index + 1),
        title: typeof citation.title === "string" && citation.title.trim() ? cleanTitle(citation.title) : citation.url,
        description: typeof citation.description === "string" ? citation.description : "",
        url: citation.url,
        favicon: typeof citation.favicon === "string" ? citation.favicon : "",
      },
    ];
  });
}

export function parsePageResponse(data: unknown): PageResponse {
  if (!isRecord(data) || typeof data.found !== "boolean") {
    throw new GrokipediaValidationError("Grokipedia returned an invalid article response. Try again.");
  }
  if (!data.found) return { found: false, page: null };
  const page = data.page;
  if (
    !isRecord(page) ||
    typeof page.slug !== "string" ||
    !page.slug.trim() ||
    typeof page.title !== "string" ||
    !cleanTitle(page.title) ||
    typeof page.content !== "string"
  ) {
    throw new GrokipediaValidationError("Grokipedia returned an invalid article. Try again.");
  }
  const stats = isRecord(page.stats) ? page.stats : {};
  return {
    found: true,
    page: {
      slug: page.slug,
      title: cleanTitle(page.title),
      content: page.content,
      description: typeof page.description === "string" ? page.description : "",
      citations: parseCitations(page.citations),
      stats: { viewCount: parseCount(stats.viewCount ?? stats.totalViews) },
      images: Array.isArray(page.images) ? page.images : [],
      fixedIssues: Array.isArray(page.fixedIssues) ? page.fixedIssues : [],
      metadata: isRecord(page.metadata) ? page.metadata : {},
      linkedPages: Array.isArray(page.linkedPages) ? page.linkedPages : [],
    },
  };
}
