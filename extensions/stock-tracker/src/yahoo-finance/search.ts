import fetch from "cross-fetch";

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
  const urlQuery = encodeURIComponent(query);
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${urlQuery}`;
  return (await (await fetch(url, { signal: abortSignal })).json()) as SearchResult;
}
