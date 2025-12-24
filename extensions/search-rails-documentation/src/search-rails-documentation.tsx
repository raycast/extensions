import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import { SearchData, SearchResult } from "./types/search";
import { buildUrlWith } from "./helpers/url";
import { DocumentationDetail } from "./components/DocumentationDetail";

export default function SearchRailsDocs() {
  const [searchText, setSearchText] = useState("");

  const { data: rawData, isLoading } = useFetch<string>(buildUrlWith("js/search_index.js"), {
    keepPreviousData: true,
    execute: true,
    parseResponse: async (response: Response) => await response.text(),
  });

  const searchData = useMemo<SearchResult[]>(() => {
    if (!rawData) return [];

    try {
      const startIndex = rawData.indexOf("{");
      const endIndex = rawData.lastIndexOf("}");
      const jsonString = rawData.substring(startIndex, endIndex + 1);
      const data: SearchData = JSON.parse(jsonString);

      const results: SearchResult[] = [];

      data.index.info.forEach((item) => {
        const [name, type, path, namespace] = item;
        results.push({
          name,
          type,
          path,
          namespace: namespace || "",
        });
      });

      return results;
    } catch {
      return [];
    }
  }, [rawData]);

  const filteredResults = useMemo(() => {
    if (!searchText) return [];

    const query = searchText.toLowerCase();
    return searchData
      .filter((item: SearchResult) => {
        const searchableText = `${item.name} ${item.namespace} ${item.type}`.toLowerCase();
        return searchableText.includes(query);
      })
      .slice(0, 50);
  }, [searchText, searchData]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Rails documentation..."
      throttle
    >
      {searchText === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Rails Documentation"
          description="Type to search through Ruby on Rails API documentation"
        />
      ) : filteredResults && filteredResults.length > 0 ? (
        filteredResults.map((result: SearchResult, index: number) => (
          <List.Item
            key={`${result.path}-${index}`}
            title={result.name}
            subtitle={result.namespace}
            accessories={[{ text: result.type }]}
            actions={
              <ActionPanel>
                <>
                  <Action.Push title="View Documentation" target={<DocumentationDetail result={result} />} />
                  <Action.OpenInBrowser url={buildUrlWith(result.path)} />
                </>
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={buildUrlWith(result.path)}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results Found"
          description={`No documentation found for "${searchText}"`}
        />
      )}
    </List>
  );
}
