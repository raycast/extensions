import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { toTitleCase, convertHtmlToMarkdown, formatBreadcrumbs } from "../utilities";
type Result = {
  title: string;
  url: string;
  gid: string;
  highlights?: string[];
  type?: string;
  snippet?: string;
  content_category?: string;
  object_label?: string;
  markdown?: string;
  version?: string;
  breadcrumb?: string;
  pretty_breadcrumbs?: string;
  icon?: {
    source: string;
    tooltip?: string;
  };
};

type ContentCategory = {
  content_category: string;
  count: number;
};

export type CategoryOption = {
  id: string;
  name: string;
  count?: number;
};

type APIResponse = {
  results?: Result[];
  hit_counts_by_content_category?: ContentCategory[];
  num_pages: number;
  page: number;
  total: number;
  query: string;
};

function getApiVersion() {
  const { api_version } = getPreferenceValues<{ api_version: string }>();
  return api_version ? api_version : "latest";
}
export function useSearchResults(query: string, category?: string) {
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setPage(1);
    setAllResults([]);
    setHasMore(true);
  }, [query, category]);

  let url = `https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}&version=${getApiVersion()}&page=${page}`;

  if (category && category !== "all") {
    url += `&content_category=${encodeURIComponent(category)}`;
  }
  const { data, isLoading, error, revalidate } = useFetch(url, {
    keepPreviousData: true,
    execute: Boolean(query),
    onError: (error) => {
      showFailureToast(error, { title: "Failed to fetch search results" });
    },
  });

  useEffect(() => {
    if (!data) return;
    const apiResponse = data as APIResponse;

    const newResponses = apiResponse.results?.filter((item) => {
      return !allResults.some((existingItem) => existingItem.gid === item.gid);
    });

    if (newResponses && newResponses.length > 0) {
      newResponses.forEach((result) => {
        result.object_label = result.gid && result.gid.startsWith("-object") ? "Object" : toTitleCase(result.type);
        result.markdown = `## ${result.title}\n\n${convertHtmlToMarkdown(result.snippet)}`;
        result.pretty_breadcrumbs = formatBreadcrumbs(result.breadcrumb, result.content_category);
        result.icon = {
          source: result.object_label ? result.object_label.toLowerCase() + ".png" : "other.png",
          tooltip: result.object_label,
        };
      });
    }
    setAllResults((prev) => [...prev, ...(newResponses || [])]);

    setHasMore(apiResponse.page < apiResponse.num_pages);
  }, [data]);

  const pagination = {
    onLoadMore: () => {
      setPage((prev) => prev + 1);
    },
    hasMore,
    pageSize: 50,
  };

  return {
    data: allResults,
    isLoading,
    error,
    revalidate,
    pagination,
  };
}

export function useSearchCategories(query: string) {
  const { data } = useFetch(
    `https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}&version=${getApiVersion()}&page=1`,
    {
      keepPreviousData: true,
      execute: Boolean(query),
      onError: (error) => {
        showFailureToast(error, { title: "Failed to fetch search results" });
      },
    },
  );

  let allOptions: CategoryOption[] = [{ id: "all", name: "All Categories" }];
  const apiData = data as APIResponse;
  if (apiData?.hit_counts_by_content_category) {
    const categoryOptions = apiData.hit_counts_by_content_category.map((category) => ({
      id: category.content_category,
      name: category.content_category,
      count: category.count,
    }));
    allOptions = [...allOptions, ...categoryOptions];
  }

  return {
    categoryOptions: allOptions,
  };
}
