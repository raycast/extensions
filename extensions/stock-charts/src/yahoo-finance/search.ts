import { get } from "./client";

export interface SearchQuote {
  symbol: string;
  shortname: string;
  longname: string;
  quoteType: string;
  exchDisp: string;
}

export interface SearchResult {
  quotes: SearchQuote[];
}

export async function search(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  return get<SearchResult>(
    "/v1/finance/search",
    {
      q: query,
      quotesCount: "12",
      newsCount: "0",
      listsCount: "0",
    },
    signal,
  );
}
