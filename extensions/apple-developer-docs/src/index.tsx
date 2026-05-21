import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { capitalizeRecursively, getIcon, makeUrl, makeUrlMarkdown } from "./utils";
import { config } from "./config";
import { useFetch } from "@raycast/utils";
import useSearchedResults from "./hooks/useSearchedResults";
import DevOnlyActionPanel from "./DevOnlyActionPanel";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.length === 0 ? "SwiftUI" : searchText;

  // Keep q in the URL so useFetch re-runs when the search text changes; the API reads text from the POST body.
  const { data, isLoading } = useFetch(`${config.apiBaseUrl}?q=${encodeURIComponent(query)}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Raycast Apple Developer Docs",
    },
    body: JSON.stringify({ text: query, targetResultLocale: "en", results: config.maxResults }),
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Apple Developer search request failed with status ${response.status}`);
      }

      return normalizeResponse((await response.json()) as AppleSearchResponse);
    },
    keepPreviousData: true,
    initialData: { results: [], featuredResult: "", suggested_query: "", uuid: "" },
  });

  const resultsTitle = useMemo(() => {
    const { suggested_query } = data;
    if (typeof suggested_query === "string") {
      return "Results";
    }

    return `Results for "${suggested_query.query}"`;
  }, [data.suggested_query]);

  const [typeFilter, setTypeFilter] = useState<AllResultType | ResultType>("all");
  const onTypeChange = useCallback((type: string) => {
    setTypeFilter(type);
  }, []);
  const results = useMemo(() => {
    const { results } = data;
    if (typeFilter.toLowerCase() === "all") {
      return results;
    }

    return results.filter((result) => result.type === typeFilter);
  }, [data.results, typeFilter]);

  const { results: searchedResults, markAsSearched } = useSearchedResults();
  const filteredSearchedResults = useMemo(() => {
    if (typeFilter.toLowerCase() === "all") {
      return searchedResults;
    }

    const filteredResults = searchedResults?.filter((result) => result.type.toLowerCase() === typeFilter.toLowerCase());

    return filteredResults?.filter(
      (result) => searchText.trim() === "" || result.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchedResults, searchText, typeFilter]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Apple Developer documentation..."
      searchBarAccessory={
        <TypeDropdown types={["all", "general", "documentation", "sample_code", "video"]} onTypeChange={onTypeChange} />
      }
      throttle
    >
      {filteredSearchedResults && filteredSearchedResults.length > 0 && (
        <List.Section title="Searched">
          {filteredSearchedResults.map((result, i) => (
            <SearchListItem key={i} result={result} onVisit={markAsSearched} />
          ))}
        </List.Section>
      )}
      {typeof data.featuredResult !== "string" && (
        <List.Section title="Featured">
          <SearchListItem result={data.featuredResult} onVisit={markAsSearched} />
        </List.Section>
      )}
      <List.Section title={resultsTitle} subtitle={results.length + ""}>
        {results.map((result) => (
          <SearchListItem key={`${result.order}_${result.url}`} result={result} onVisit={markAsSearched} />
        ))}
      </List.Section>
    </List>
  );
}

function normalizeResponse(payload: AppleSearchResponse): PayloadResponse {
  return {
    results: (payload.results ?? []).slice(0, config.maxResults).map(normalizeResult),
    featuredResult: "",
    suggested_query: "",
    uuid: "",
  };
}

function normalizeResult(result: AppleSearchResult, order: number): SearchResult {
  if ("documentation" in result) {
    const metadata = result.documentation.metadata;
    const type = metadata.kind === "sampleCode" ? "sample_code" : "documentation";

    return createSearchResult({
      title: metadata.title,
      description: metadata.description,
      url: metadata.permalink,
      type,
      order,
      platform: platformsFromAvailability(metadata.availability),
      breadcrumbs: breadcrumbsFromHierarchy(metadata.hierarchy),
    });
  }

  if ("devsite" in result) {
    const metadata = result.devsite.metadata;

    return createSearchResult({
      title: metadata.title,
      description: metadata.description,
      url: metadata.sourceURL,
      type: "general",
      order,
    });
  }

  const metadata = result.developer.metadata;
  const itemType = first(metadata.itemTypes);

  return createSearchResult({
    title: first(metadata.titles),
    description: first(metadata.descriptions),
    url: first(metadata.permalinks),
    type: isVideoResult(itemType) ? "video" : "general",
    order,
    date: first(metadata.availabilityDates),
    event_name: first(metadata.projectNames),
    session_id: first(metadata.ids),
    tile_image: first(metadata.thumbnailLinks),
    language: first(metadata.deliveryLanguageCodes),
    duration: metadata.mediaDurations?.[0]?.toString(),
  });
}

function createSearchResult({
  title,
  description,
  url,
  type,
  order,
  platform = [],
  breadcrumbs = [],
  date = "",
  event_name = "",
  session_id = "",
  tile_image = "",
  language = "",
  duration,
}: Partial<SearchResult> & Pick<SearchResult, "type" | "order">): SearchResult {
  return {
    title: title ?? "Untitled",
    description: description ?? "",
    url: url ?? config.rootUrl,
    type,
    order,
    platform,
    breadcrumbs,
    date,
    event_name,
    session_id,
    tile_image,
    relevance: 0,
    is_beta: 0,
    language,
    lang_children: [],
    duration,
  };
}

function first(values?: string[]) {
  return values?.[0] ?? undefined;
}

function isVideoResult(type?: string) {
  return ["session", "video"].includes(type?.toLowerCase() ?? "");
}

function platformsFromAvailability(availability?: string) {
  return (availability ?? "")
    .split("|")
    .map((platform) => platform.trim().split(" ")[0])
    .filter(Boolean);
}

function breadcrumbsFromHierarchy(hierarchy?: string) {
  return (hierarchy ?? "")
    .split(">")
    .map((breadcrumb) => breadcrumb.trim())
    .filter(Boolean);
}

function ItemActionPanel({ result, onVisit }: { result: ResultLike } & Visitable) {
  const { title } = result;
  const url = useMemo(() => makeUrl(result.url), [result.url]);
  const markAsSearched = useCallback(() => {
    onVisit(result);
  }, [onVisit, result]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={url} onOpen={markAsSearched} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy URL"
          content={url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
          onCopy={markAsSearched}
        />
        <Action.CopyToClipboard
          title="Copy URL in Markdown"
          content={makeUrlMarkdown(url, title)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          onCopy={markAsSearched}
        />
      </ActionPanel.Section>
      <DevOnlyActionPanel />
    </ActionPanel>
  );
}

function SearchListItem({ result, onVisit }: { result: ResultLike } & Visitable) {
  const icon = useMemo(() => {
    return result.type === "featured" ? makeUrl((result as FeaturedResult).icon) : getIcon(result.type);
  }, [result]);

  return (
    <List.Item
      title={result.title}
      icon={icon}
      subtitle={result.type !== "featured" ? (result as SearchResult).platform.join(", ") : undefined}
      actions={<ItemActionPanel result={result} onVisit={onVisit} />}
    />
  );
}

type TypeDropdownProps = {
  types: (AllResultType | ResultType)[];
  onTypeChange: (type: AllResultType | ResultType) => void;
};
function TypeDropdown({ types, onTypeChange }: TypeDropdownProps) {
  return (
    <List.Dropdown tooltip="Select result type" storeValue={true} onChange={onTypeChange}>
      <List.Dropdown.Section title="Result Types">
        {types.map((resultType) => (
          <List.Dropdown.Item
            icon={getIcon(resultType)}
            key={resultType}
            title={capitalizeRecursively(resultType.replace("_", " ").toLowerCase())}
            value={resultType}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
