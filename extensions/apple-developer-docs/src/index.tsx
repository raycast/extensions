import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { config } from "./config";
import { capitalizeRecursively, getIcon, makeUrl, makeUrlMarkdown } from "./utils";

export default function Command() {
  const { state, search } = useSearch();
  const resultsTitle = useMemo(() => {
    const { suggested_query } = state.payload;
    if (typeof suggested_query === "string") {
      return "Results";
    }

    return `Results for "${suggested_query.query}"`;
  }, [state.payload.suggested_query]);

  const [typeFilter, setTypeFilter] = useState<AllResultType | ResultType>("all");
  const onTypeChange = useCallback((type: string) => {
    setTypeFilter(type);
  }, []);
  const results = useMemo(() => {
    const { results } = state.payload;
    switch (typeFilter) {
      case "general":
      case "documentation":
      case "sample_code":
      case "video":
        return results.filter((result) => result.type === typeFilter);
      default:
        return results;
    }
  }, [state.payload.results, typeFilter]);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Apple Developer documentation..."
      searchBarAccessory={
        <TypeDropdown types={["all", "general", "documentation", "sample_code", "video"]} onTypeChange={onTypeChange} />
      }
      throttle
    >
      {typeof state.payload.featuredResult !== "string" && (
        <List.Section title="Featured">
          <SearchFeaturedItem featured={state.payload.featuredResult} />
        </List.Section>
      )}
      <List.Section title={resultsTitle} subtitle={results.length + ""}>
        {results.map((result) => (
          <SearchListItem key={`${result.order}_${result.url}`} result={result} />
        ))}
      </List.Section>
    </List>
  );
}

function ItemActionPanel({ url, title }: { url: string; title?: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action.CopyToClipboard
          title="Copy URL in Markdown"
          content={makeUrlMarkdown(url, title)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SearchFeaturedItem({ featured }: { featured: FeaturedResult }) {
  const url = useMemo(() => makeUrl(featured.url), [featured.url]);

  return (
    <List.Item
      title={featured.title}
      icon={makeUrl(featured.icon)}
      subtitle={featured.description}
      actions={<ItemActionPanel url={url} title={featured.title} />}
    />
  );
}

function SearchListItem({ result }: { result: SearchResult }) {
  const icon = useMemo(() => getIcon(result.type), [result.type]);
  const url = useMemo(() => makeUrl(result.url), [result.url]);

  return (
    <List.Item
      title={result.title}
      icon={icon}
      subtitle={result.description}
      accessories={[{ text: result.platform.join(", "), icon: result.tile_image }]}
      actions={<ItemActionPanel url={url} title={result.title} />}
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

function useSearch() {
  const [state, setState] = useState<SearchState>({
    payload: { results: [], featuredResult: "", suggested_query: "", uuid: "" },
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({ ...oldState, isLoading: true }));
      try {
        const payload = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          payload,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({ ...oldState, isLoading: false }));

        if (error instanceof AbortError) {
          return;
        }

        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state,
    search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<PayloadResponse> {
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "SwiftUI" : searchText);
  params.append("results", config.maxResults.toString());

  const response = await fetch(config.apiBaseUrl + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as PayloadResponse;

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return json;
}

interface SearchState {
  payload: PayloadResponse;
  isLoading: boolean;
}
