import { get } from "./client";

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  thumbnail?: { resolutions: { url: string; width: number; height: number }[] };
}

interface NewsSearchResponse {
  news: NewsItem[];
}

export async function fetchNews(
  symbol: string,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const res = await get<NewsSearchResponse>(
    "/v1/finance/search",
    {
      q: symbol,
      quotesCount: "0",
      newsCount: "5",
      listsCount: "0",
    },
    signal,
  );
  return res.news ?? [];
}
