import { useEffect, useRef, useState } from "react";
import { ArticlePage, searchArticles, WikiHowSearchError } from "../lib/wikihow";

export function useArticleSearch(query: string, page: number, apiKey: string, revision: number) {
  const [data, setData] = useState<ArticlePage>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const lastRequest = useRef(0);
  const cooldownUntil = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    if (!query.trim() || !apiKey.trim()) {
      setIsLoading(false);
      return () => controller.abort();
    }
    setIsLoading(true);
    // Debounce typing and leave at least 1.1 seconds between request starts.
    const delay = Math.max(650, lastRequest.current + 1100 - Date.now(), cooldownUntil.current - Date.now());
    const timer = setTimeout(async () => {
      lastRequest.current = Date.now();
      try {
        const result = await searchArticles(query, page, apiKey, controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          if (cause instanceof WikiHowSearchError && cause.code === "rate-limit") {
            cooldownUntil.current = Date.now() + (cause.retryAfterSeconds ?? 30) * 1000;
          }
          setError(cause instanceof Error ? cause : new Error("Search failed. Please try again."));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, apiKey, revision]);

  return { data, error, isLoading };
}
