import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import yahooFinance, { type NewsItem } from "./yahoo-finance";

export function useNews(symbol: string | undefined): {
  news: NewsItem[];
  isLoading: boolean;
} {
  const abortRef = useRef<AbortController>(new AbortController());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setNews([]);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    (async () => {
      setIsLoading(true);
      try {
        const items = await yahooFinance.fetchNews(symbol, signal);
        setNews(items);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showToast({
            style: Toast.Style.Failure,
            title: "News Error",
            message: e.message,
          });
          setNews([]);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [symbol]);

  return { news, isLoading };
}
