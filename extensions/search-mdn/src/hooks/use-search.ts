import { URL } from "node:url";
import { useRef } from "react";

import { useCachedPromise } from "@raycast/utils";

import { getMdnKind, toAbsoluteMdnUrl, toMdnPath } from "@/lib/mdn";
import type { Result } from "@/types";

type MdnSearchDocument = {
  mdn_url?: string;
  title?: string;
  summary?: string;
};

type MdnSearchResponse = {
  documents?: MdnSearchDocument[];
};

const SEARCH_API_URL = "https://developer.mozilla.org/api/v1/search";

function buildSearchUrl(query: string, locale: string): string | undefined {
  if (!query) {
    return undefined;
  }

  const url = new URL(SEARCH_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "best");
  url.searchParams.set("locale", locale);
  return url.toString();
}

function buildResult(document: MdnSearchDocument): Result | undefined {
  if (typeof document.title !== "string" || typeof document.mdn_url !== "string") {
    return undefined;
  }

  const title = document.title.trim();
  if (!title) {
    return undefined;
  }

  const path = toMdnPath(document.mdn_url);
  const summary =
    typeof document.summary === "string" && document.summary.trim().length > 0 ? document.summary.trim() : undefined;

  return {
    id: path,
    title,
    url: toAbsoluteMdnUrl(path),
    path,
    summary,
    kind: getMdnKind(path),
  };
}

export const useSearch = (query: string, locale: string) => {
  const abortable = useRef<AbortController>();
  const searchUrl = buildSearchUrl(query.trim(), locale);

  const {
    data: results,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(
    async (url: string | undefined) => {
      if (!url) {
        return [];
      }

      const response = await fetch(url, { signal: abortable.current?.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as MdnSearchResponse;
      const documents = Array.isArray(payload.documents) ? payload.documents : [];
      const mapped: Result[] = [];

      for (const document of documents) {
        const result = buildResult(document);
        if (result) {
          mapped.push(result);
        }
      }

      return mapped;
    },
    [searchUrl],
    {
      keepPreviousData: true,
      abortable,
      failureToastOptions: { title: "Could not load MDN results" },
    },
  );

  const data = searchUrl ? results ?? [] : [];

  return { isLoading: Boolean(searchUrl) && isLoading, data, revalidate, error };
};
