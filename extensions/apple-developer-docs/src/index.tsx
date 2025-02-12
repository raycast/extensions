import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { capitalizeRecursively, getIcon, makeUrl, makeUrlMarkdown } from "./utils";
import { config } from "./config";
import { useFetch } from "@raycast/utils";
import useSearchedResults from "./hooks/useSearchedResults";
import DevOnlyActionPanel from "./DevOnlyActionPanel";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "SwiftUI" : searchText);
  params.append("results", config.maxResults.toString());

  const { data, isLoading } = useFetch(config.apiBaseUrl + "?" + params.toString(), {
    parseResponse: async (response) => (await response.json()) as PayloadResponse,
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

    const filteredResults = searchedResults?.filter((result) => result.type === typeFilter.toLowerCase());

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
