import type { FetchError, FetchFormat, FetchResult, SearchResult } from "./tinyfish";
import { getContentText } from "./content.ts";

export type SearchToolResult = {
  results: {
    position: number;
    url: string;
    title: string;
    snippet: string;
    site_name: string;
    publisher: string;
    date: string;
    authors: string[];
    venue: string;
    year?: number;
    cited_by_count?: number;
    pdf_url?: string;
  }[];
  page: number;
};
export function searchToolResult(results: SearchResult[], page: number): SearchToolResult {
  return {
    page,
    results: results.map((result) => ({
      position: result.position,
      url: result.url,
      title: result.title,
      snippet: result.snippet ?? "",
      site_name: result.site_name ?? "",
      publisher: result.publisher ?? "",
      date: result.date ?? "",
      authors: result.authors ?? [],
      venue: result.venue ?? "",
      year: result.year ?? undefined,
      cited_by_count: result.cited_by_count ?? undefined,
      pdf_url: result.pdf_url ?? undefined,
    })),
  };
}

export type FetchToolResult = {
  results: {
    url: string;
    final_url: string;
    title: string;
    text: string;
    format: string;
    links: string[];
    image_links: string[];
    unmatched_selectors: string[];
  }[];
  errors: {
    url: string;
    error: string;
    status?: number;
    candidate_selectors: string[];
    unmatched_selectors: string[];
  }[];
};
export function fetchToolResult(
  response: { results: FetchResult[]; errors: FetchError[] },
  format: FetchFormat = "markdown",
): FetchToolResult {
  return {
    results: response.results.map((page) => ({
      url: page.url,
      final_url: page.final_url ?? page.url,
      title: page.title ?? page.url,
      text: getContentText(page),
      format: page.format ?? format,
      links: page.links ?? [],
      image_links: page.image_links ?? [],
      unmatched_selectors: page.unmatched_selectors ?? [],
    })),
    errors: response.errors.map((error) => ({
      url: error.url,
      error: error.error,
      status: error.status ?? undefined,
      candidate_selectors: error.candidate_selectors ?? [],
      unmatched_selectors: error.unmatched_selectors ?? [],
    })),
  };
}
