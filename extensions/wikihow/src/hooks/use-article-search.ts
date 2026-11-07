import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { searchArticles, WikiHowSearchError } from "../lib/wikihow";

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export function useArticleSearch(query: string, page: number, apiKey: string, revision: number) {
  const abortable = useRef<AbortController>(null);
  const lastRequest = useRef(0);
  const cooldownUntil = useRef(0);
  return useCachedPromise(
    // `revision` is part of the arguments so Retry Search starts a fresh request.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (query: string, page: number, apiKey: string, _revision: number) => {
      const signal = abortable.current?.signal;
      // Debounce typing and leave at least 1.1 seconds between request starts.
      await wait(Math.max(650, lastRequest.current + 1100 - Date.now(), cooldownUntil.current - Date.now()), signal);
      lastRequest.current = Date.now();
      try {
        return await searchArticles(query, page, apiKey, signal);
      } catch (cause) {
        if (cause instanceof WikiHowSearchError && cause.code === "rate-limit") {
          cooldownUntil.current = Date.now() + (cause.retryAfterSeconds ?? 30) * 1000;
        }
        throw cause instanceof Error ? cause : new Error("Search failed. Please try again.");
      }
    },
    [query, page, apiKey, revision],
    {
      abortable,
      execute: Boolean(query.trim() && apiKey.trim()),
      keepPreviousData: false,
      onError: () => undefined,
    },
  );
}
