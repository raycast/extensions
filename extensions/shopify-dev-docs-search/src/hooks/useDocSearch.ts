import { useFetch, showFailureToast } from "@raycast/utils";
import { toTitleCase, convertHtmlToMarkdown, formatBreadcrumbs } from "../utilities";
type Result = {
  title: string;
  url: string;
  gid: string;
  type?: string;
  description?: string;
  category?: string;
  version?: string;
  object_label?: string;
  markdown?: string;
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
  categoryHits?: ContentCategory[];
  total?: number;
};

// The API no longer returns a breadcrumb field, so rebuild one from the
// result's URL path, minus the final segment (the page itself).
function breadcrumbFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const parts = url.split("/").filter(Boolean).slice(0, -1);
  return parts.length > 0 ? parts.join(" / ") : undefined;
}

export function useSearchResults(query: string, category?: string) {
  // The API no longer supports pagination. All results are returned at once
  let url = `https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}`;

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

  const apiResponse = data as APIResponse | undefined;

  const seen = new Set<string>();
  const results = (apiResponse?.results ?? [])
    .filter((result) => {
      if (seen.has(result.gid)) return false;
      seen.add(result.gid);
      return true;
    })
    .map((result) => {
      const object_label = toTitleCase(result.type);
      return {
        ...result,
        object_label,
        markdown: `## ${result.title}\n\n${convertHtmlToMarkdown(result.description)}`,
        pretty_breadcrumbs: formatBreadcrumbs(breadcrumbFromUrl(result.url), result.category),
        icon: {
          source: object_label ? object_label.toLowerCase() + ".png" : "other.png",
          tooltip: object_label || undefined,
        },
      };
    });

  return {
    data: results,
    isLoading,
    error,
    revalidate,
  };
}

export function useSearchCategories(query: string) {
  const { data } = useFetch(`https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}`, {
    keepPreviousData: true,
    execute: Boolean(query),
    onError: (error) => {
      showFailureToast(error, { title: "Failed to fetch search results" });
    },
  });

  let allOptions: CategoryOption[] = [{ id: "all", name: "All Categories" }];
  const apiData = data as APIResponse;
  if (apiData?.categoryHits) {
    const categoryOptions = apiData.categoryHits.map((category) => ({
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
