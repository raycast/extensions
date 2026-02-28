import { useMemo } from "react";

import { useCachedPromise } from "@raycast/utils";

import { buildResultSummary, getMdnKind, toAbsoluteMdnUrl, toMdnPath } from "@/lib/mdn";
import { fetchSearchIndex } from "@/lib/search-index";
import type { MdnSearchIndexItem, Result } from "@/types";

const MAX_RESULTS = 200;

function scoreResult(item: MdnSearchIndexItem, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const title = item.title.toLowerCase();

  let score = 0;

  if (title === normalizedQuery) {
    score += 280;
  } else if (title.startsWith(normalizedQuery)) {
    score += 180;
  } else if (title.includes(normalizedQuery)) {
    score += 120;
  } else {
    const url = item.url.toLowerCase();
    if (url.includes(normalizedQuery)) {
      score += 90;
    } else {
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        if (title.includes(term)) {
          score += 35;
        }
        if (url.includes(term)) {
          score += 20;
        }
      }
    }
  }

  return score;
}

function buildResult(item: MdnSearchIndexItem): Result {
  const path = toMdnPath(item.url);

  return {
    id: path,
    title: item.title,
    url: toAbsoluteMdnUrl(path),
    path,
    summary: buildResultSummary(path),
    kind: getMdnKind(path),
  };
}

function rankAndFilter(index: MdnSearchIndexItem[], query: string): Result[] {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return index.slice(0, MAX_RESULTS).map((item) => buildResult(item));
  }

  return index
    .map((item) => ({ item, score: scoreResult(item, trimmedQuery) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.item.title.localeCompare(b.item.title);
    })
    .slice(0, MAX_RESULTS)
    .map((candidate) => buildResult(candidate.item));
}

export const useSearch = (query: string, locale: string) => {
  const {
    data: index,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(fetchSearchIndex, [locale], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load MDN search index" },
  });

  const data = useMemo(() => {
    return rankAndFilter(index ?? [], query);
  }, [index, query]);

  return { isLoading, data, revalidate, error };
};
