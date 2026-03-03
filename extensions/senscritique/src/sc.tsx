import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";

const GRAPHQL_ENDPOINT = "https://apollo.senscritique.com/graphql";
const AUTOCOMPLETE_DEBOUNCE_MS = 80;
const FULL_SEARCH_DEBOUNCE_MS = 220;
const AUTOCOMPLETE_LIMIT = 12;
const FULL_SEARCH_LIMIT = 40;

const SEARCH_AUTOCOMPLETE_QUERY = `
  query SearchAutocomplete($keywords: String!, $universe: String, $limit: Int) {
    searchAutocomplete(keywords: $keywords, universe: $universe, limit: $limit) {
      items {
        product {
          id
          title
          originalTitle
          url
          universe
          dateRelease
          dateReleaseOriginal
          medias {
            picture
          }
        }
      }
    }
  }
`;

const SEARCH_PRODUCTS_QUERY = `
  query SearchProductExplorer(
    $query: String
    $offset: Int
    $limit: Int
    $filters: [SearchFilter]
    $sortBy: SearchProductExplorerSort
  ) {
    searchProductExplorer(
      query: $query
      offset: $offset
      limit: $limit
      filters: $filters
      sortBy: $sortBy
    ) {
      items {
        id
        title
        originalTitle
        url
        universe
        yearOfProduction
        dateRelease
        dateReleaseOriginal
        rating
        medias {
          picture
        }
        stats {
          ratingCount
        }
      }
    }
  }
`;

type Arguments = {
  title?: string;
};

type ContentType = "film" | "serie" | "livre" | "jeu";
type FilterType = "all" | ContentType;

type SearchResult = {
  id: string;
  title: string;
  originalTitle?: string;
  url: string;
  type: ContentType;
  year?: number;
  posterUrl?: string;
  communityRating?: string;
  ratingCount?: number;
};

type SearchProductItem = {
  id: number;
  title?: string;
  originalTitle?: string;
  url?: string;
  universe?: number;
  yearOfProduction?: number;
  dateRelease?: string;
  dateReleaseOriginal?: string;
  rating?: number;
  medias?: { picture?: string };
  stats?: { ratingCount?: number };
};

type SearchAutocompleteResponse = {
  data?: {
    searchAutocomplete?: {
      items?: Array<{
        product?: SearchProductItem;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

type SearchProductsResponse = {
  data?: {
    searchProductExplorer?: {
      items?: SearchProductItem[];
    };
  };
  errors?: Array<{ message?: string }>;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const initialText = props.arguments.title?.trim() ?? "";
  const [searchText, setSearchText] = useState(initialText);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const trimmedQuery = useMemo(() => searchText.trim(), [searchText]);

  const visibleResults = useMemo(() => {
    const filtered = selectedFilter === "all" ? results : results.filter((result) => result.type === selectedFilter);
    return [...filtered].sort(sortByRatingCountDesc);
  }, [results, selectedFilter]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setResults([]);
    setErrorMessage(undefined);
    setIsLoading(true);

    const autocompleteTimer = setTimeout(async () => {
      try {
        const quickResults = await fetchAutocompleteResults(trimmedQuery, controller.signal);
        if (!controller.signal.aborted && quickResults.length > 0) {
          setResults((prev) => mergeResults(quickResults, prev));
        }
      } catch {
        // Autocomplete failure is non-blocking. Full search still runs.
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    const fullTimer = setTimeout(async () => {
      try {
        const fullResults = await fetchFullResults(trimmedQuery, controller.signal);
        if (!controller.signal.aborted) {
          // Full search contains ratings/review counts. Replace autocomplete-only results.
          setResults(fullResults);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setErrorMessage(message);
          console.error("SensCritique full search failed", { message });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, FULL_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(autocompleteTimer);
      clearTimeout(fullTimer);
      controller.abort();
    };
  }, [trimmedQuery]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search movies, TV shows, books, games... (Enter: details, Shift+Enter: open)"
      throttle
    >
      {!trimmedQuery && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type a title"
          description="Enter opens details. Shift+Enter opens the SensCritique URL."
        />
      )}

      {!!trimmedQuery && !!errorMessage && visibleResults.length === 0 && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Search failed" description={errorMessage} />
      )}

      {!!trimmedQuery && !isLoading && visibleResults.length === 0 && !errorMessage && (
        <List.EmptyView
          icon={Icon.Document}
          title="No results found"
          description="Try another title or change the filter."
        />
      )}

      {!!trimmedQuery && (
        <List.Item
          id="filters-row"
          icon={Icon.Filter}
          title={buildFilterChips(results, selectedFilter)}
          accessories={[{ text: `${visibleResults.length} results` }]}
          actions={
            <ActionPanel>
              <Action title="Next Filter" onAction={() => setSelectedFilter(nextFilter(selectedFilter, results))} />
              <Action
                title="Filter: All"
                onAction={() => setSelectedFilter("all")}
              />
              <Action
                title="Filter: Movie"
                onAction={() => setSelectedFilter("film")}
              />
              <Action
                title="Filter: TV Show"
                onAction={() => setSelectedFilter("serie")}
              />
              <Action
                title="Filter: Book"
                onAction={() => setSelectedFilter("livre")}
              />
              <Action
                title="Filter: Game"
                onAction={() => setSelectedFilter("jeu")}
              />
            </ActionPanel>
          }
        />
      )}

      {visibleResults.map((result) => (
        <List.Item
          key={result.id}
          icon={buildItemIcon(result)}
          title={result.title}
          subtitle={buildSubtitle(result)}
          accessories={buildAccessories(result)}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ResultDetail result={result} />} />
              <Action.OpenInBrowser
                title="Open in Browser ⇧↩"
                url={result.url}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
              />
              <Action.CopyToClipboard title="Copy URL" content={result.url} />
              <Action
                title="Filter: All"
                onAction={() => setSelectedFilter("all")}
              />
              <Action
                title="Filter: Movie"
                onAction={() => setSelectedFilter("film")}
              />
              <Action
                title="Filter: TV Show"
                onAction={() => setSelectedFilter("serie")}
              />
              <Action
                title="Filter: Book"
                onAction={() => setSelectedFilter("livre")}
              />
              <Action
                title="Filter: Game"
                onAction={() => setSelectedFilter("jeu")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ResultDetail({ result }: { result: SearchResult }) {
  return (
    <Detail
      markdown={buildDetailMarkdown(result)}
      metadata={buildDetailMetadata(result)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser ⇧↩" url={result.url} />
          <Action.CopyToClipboard title="Copy URL" content={result.url} />
        </ActionPanel>
      }
    />
  );
}

function buildDetailMetadata(result: SearchResult) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" text={{ value: labelForType(result.type), color: Color.PrimaryText }} />
      <Detail.Metadata.Label
        title="Year"
        text={
          result.year
            ? { value: String(result.year), color: Color.PrimaryText }
            : { value: "Unknown", color: Color.SecondaryText }
        }
      />
      <Detail.Metadata.Label
        title="Community Rating"
        text={
          result.communityRating
            ? {
                value: result.communityRating,
                color: Color.Orange,
              }
            : { value: "Unrated", color: Color.SecondaryText }
        }
      />
      <Detail.Metadata.Label
        title="Ratings Count"
        text={
          result.ratingCount
            ? { value: formatCount(result.ratingCount), color: Color.PrimaryText }
            : { value: "No ratings", color: Color.SecondaryText }
        }
      />
      {!!result.originalTitle && result.originalTitle !== result.title && (
        <Detail.Metadata.Label title="Original Title" text={{ value: result.originalTitle, color: Color.PrimaryText }} />
      )}
      <Detail.Metadata.Link title="SensCritique" text="Open Page" target={result.url} />
    </Detail.Metadata>
  );
}

async function fetchAutocompleteResults(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const payload = await postGraphQL<SearchAutocompleteResponse>(
    "SearchAutocomplete",
    {
      keywords: query,
      universe: null,
      limit: AUTOCOMPLETE_LIMIT,
    },
    SEARCH_AUTOCOMPLETE_QUERY,
    signal,
  );

  const items = payload.data?.searchAutocomplete?.items ?? [];
  return dedupeByUrl(
    items
      .map((entry) => entry.product)
      .filter((item): item is SearchProductItem => item !== undefined)
      .map(mapProductToResult)
      .filter((item): item is SearchResult => item !== undefined),
  );
}

async function fetchFullResults(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const payload = await postGraphQL<SearchProductsResponse>(
    "SearchProductExplorer",
    {
      query,
      offset: 0,
      limit: FULL_SEARCH_LIMIT,
      filters: [{ identifier: "universe", termValues: ["movie", "tvShow", "book", "game"] }],
      sortBy: "RELEVANCE",
    },
    SEARCH_PRODUCTS_QUERY,
    signal,
  );

  const items = payload.data?.searchProductExplorer?.items ?? [];
  return dedupeByUrl(
    items
      .map(mapProductToResult)
      .filter((item): item is SearchResult => item !== undefined),
  );
}

async function postGraphQL<T>(
  operationName: string,
  variables: Record<string, unknown>,
  query: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ operationName, variables, query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { errors?: Array<{ message?: string }> };
  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors.map((error) => error.message).filter(Boolean).join(" | ");
    throw new Error(message || "GraphQL error");
  }

  return payload as T;
}

function mergeResults(primary: SearchResult[], secondary: SearchResult[]): SearchResult[] {
  const byUrl = new Map<string, SearchResult>();

  for (const item of primary) {
    byUrl.set(item.url, item);
  }

  for (const item of secondary) {
    const existing = byUrl.get(item.url);
    if (!existing) {
      byUrl.set(item.url, item);
      continue;
    }

    byUrl.set(item.url, {
      ...existing,
      originalTitle: existing.originalTitle || item.originalTitle,
      year: existing.year || item.year,
      posterUrl: existing.posterUrl || item.posterUrl,
      communityRating: existing.communityRating || item.communityRating,
      ratingCount: existing.ratingCount || item.ratingCount,
    });
  }

  return [...byUrl.values()];
}

function mapProductToResult(item: SearchProductItem): SearchResult | undefined {
  const url = toAbsoluteUrl(item.url);
  const type = inferTypeFromUrl(url, item.universe);

  if (!url || !type) {
    return undefined;
  }

  const title = cleanText(item.title || item.originalTitle);
  if (!title) {
    return undefined;
  }

  return {
    id: `${type}-${item.id}`,
    title,
    originalTitle: cleanText(item.originalTitle),
    url,
    type,
    year: extractYear(item),
    posterUrl: item.medias?.picture,
    communityRating: normalizeRating(item.rating),
    ratingCount: item.stats?.ratingCount,
  };
}

function dedupeByUrl(results: SearchResult[]): SearchResult[] {
  return mergeResults(results, []);
}

function extractYear(item: SearchProductItem): number | undefined {
  if (item.yearOfProduction && Number.isInteger(item.yearOfProduction)) {
    return item.yearOfProduction;
  }

  for (const dateValue of [item.dateReleaseOriginal, item.dateRelease]) {
    if (!dateValue) {
      continue;
    }
    const year = Number.parseInt(dateValue.slice(0, 4), 10);
    if (!Number.isNaN(year) && year > 0) {
      return year;
    }
  }

  return undefined;
}

function inferTypeFromUrl(url: string | undefined, universe?: number): ContentType | undefined {
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes("/film/") || lower.includes("/movie/")) {
      return "film";
    }
    if (lower.includes("/serie/") || lower.includes("/series/")) {
      return "serie";
    }
    if (lower.includes("/livre/") || lower.includes("/book/")) {
      return "livre";
    }
    if (lower.includes("/jeuvideo/") || lower.includes("/game/")) {
      return "jeu";
    }
  }

  if (universe === 1) {
    return "film";
  }
  if (universe === 2) {
    return "livre";
  }
  if (universe === 3) {
    return "jeu";
  }
  if (universe === 4 || universe === 5 || universe === 32) {
    return "serie";
  }

  return undefined;
}

function toAbsoluteUrl(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  if (input.startsWith("/")) {
    return `https://www.senscritique.com${input}`;
  }

  if (input.startsWith("www.senscritique.com")) {
    return `https://${input}`;
  }

  return undefined;
}

function normalizeRating(rating: number | undefined): string | undefined {
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return undefined;
  }
  if (rating < 0 || rating > 10) {
    return undefined;
  }
  return `${rating.toFixed(1)}/10`;
}

function cleanText(value: string | undefined): string | undefined {
  const cleaned = (value || "").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function buildSubtitle(result: SearchResult): string {
  const typeLabel = labelForType(result.type);
  return result.year ? `${typeLabel} · ${result.year}` : typeLabel;
}

function buildItemIcon(result: SearchResult): List.Item.Props["icon"] {
  if (result.posterUrl) {
    return { source: result.posterUrl };
  }
  return iconForType(result.type);
}

function buildAccessories(result: SearchResult): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  accessories.push({
    tag: result.communityRating
      ? {
          value: `Community ${result.communityRating}`,
          color: Color.Orange,
        }
      : {
          value: "unrated",
          color: Color.SecondaryText,
        },
    tooltip: "Community rating",
  });

  accessories.push({
    text:
      result.ratingCount && result.ratingCount > 0
        ? { value: `${formatCount(result.ratingCount)} ratings`, color: Color.SecondaryText }
        : { value: "No ratings", color: Color.SecondaryText },
    tooltip: "Number of community ratings",
  });

  return accessories;
}

function buildDetailMarkdown(result: SearchResult): string {
  const lines: string[] = [];

  lines.push(`# ${result.title}`);
  lines.push(`${labelForType(result.type)}${result.year ? ` · ${result.year}` : ""}`);

  if (result.originalTitle && result.originalTitle !== result.title) {
    lines.push(`*${result.originalTitle}*`);
  }

  if (result.posterUrl) {
    lines.push(`![Affiche](${result.posterUrl})`);
  }

  return lines.join("\n\n");
}

function labelForType(type: ContentType): string {
  if (type === "film") {
    return "Movie";
  }
  if (type === "serie") {
    return "TV Show";
  }
  if (type === "livre") {
    return "Book";
  }
  return "Game";
}

function iconForType(type: ContentType): Icon {
  if (type === "film") {
    return Icon.FilmStrip;
  }
  if (type === "serie") {
    return Icon.Video;
  }
  if (type === "livre") {
    return Icon.Book;
  }
  return Icon.GameController;
}

function countByType(results: SearchResult[], type: ContentType): number {
  return results.filter((result) => result.type === type).length;
}

function countForFilter(results: SearchResult[], filter: FilterType): number {
  if (filter === "all") {
    return results.length;
  }
  return countByType(results, filter);
}

function buildFilterChips(results: SearchResult[], selectedFilter: FilterType): string {
  const order: FilterType[] = ["all", ...orderedCategoryFilters(results)];
  return order
    .map((filter) => {
      const marker = filter === selectedFilter ? "●" : "○";
      return `${marker} ${labelForFilter(filter).toUpperCase()} (${countForFilter(results, filter)})`;
    })
    .join(" · ");
}

function orderedCategoryFilters(results: SearchResult[]): ContentType[] {
  const baseOrder: ContentType[] = ["film", "serie", "livre", "jeu"];
  return [...baseOrder].sort((a, b) => {
    const diff = countByType(results, b) - countByType(results, a);
    if (diff !== 0) {
      return diff;
    }
    return baseOrder.indexOf(a) - baseOrder.indexOf(b);
  });
}

function nextFilter(current: FilterType, results: SearchResult[]): FilterType {
  const order: FilterType[] = ["all", ...orderedCategoryFilters(results)];
  const index = order.indexOf(current);
  if (index < 0) {
    return "all";
  }
  return order[(index + 1) % order.length];
}

function labelForFilter(filter: FilterType): string {
  if (filter === "all") {
    return "All";
  }
  return labelForType(filter);
}

function sortByRatingCountDesc(a: SearchResult, b: SearchResult): number {
  const aCount = a.ratingCount ?? 0;
  const bCount = b.ratingCount ?? 0;
  if (aCount !== bCount) {
    return bCount - aCount;
  }
  return a.title.localeCompare(b.title);
}

function formatCount(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(value);
}
