import client from "./client";

export interface SearchResult {
  quotes: SearchQuote[];
}

export interface SearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchDisp?: string;
}

export async function search(query: string, abortSignal: AbortSignal): Promise<SearchResult> {
  console.log(`yahoo-finance: searching for '${query}'`);
  return client.get<SearchResult>("/v1/finance/search", { q: query }, abortSignal);
}
