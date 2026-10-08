import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import React, { useState, useEffect, useCallback } from "react";
import MiniSearch from "minisearch";
import { getPreferenceValues } from "@raycast/api";

import {
  formatFilePath,
  formatResult,
  getFilesInDir,
  getPreferredFormat,
  getUserConfiguredGraphPath,
  showGraphPathInvalidToast,
  validateUserConfigGraphPath,
} from "./utils";
export default function Command() {
  const { state, search } = useSearch();
  useEffect(() => {
    validateUserConfigGraphPath().catch((e) => {
      showGraphPathInvalidToast();
      throw "Folder Does not Exist";
    });
  }, [search]);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Logseq Database..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  //This is what happens when the item is clicked
  console.log(searchResult.url);
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Logseq" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: true,
  });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const fileType = await getPreferredFormat().then((fileFormat) => `.${fileFormat}`);
  const finalSearchResults: SearchResult[] = [];
  await getFilesInDir(getUserConfiguredGraphPath() + "/pages").then((result) => {
    if (getPreferenceValues().smartSearch == true && searchText.length > 0) {
      const finalInitialResult: SearchResult[] = [];
      //looping through entire database to see a match
      result.forEach((element) => {
        if (element.endsWith(fileType)) {
          // Making sure only MD/org files are shown
          finalInitialResult.push({
            name: formatResult(element).replace(fileType, ""),
            description: formatResult(element),
            url: formatFilePath(element).replace(fileType, ""),
          });
        }
      });
      //use the minisearch index
      const miniSearch = new MiniSearch({
        fields: ["name"], // fields to index for full-text se¨¨arch
        storeFields: ["name", "url"], // fields to return with search results
        idField: "name",
      });
      miniSearch.addAll(finalInitialResult);
      //  assinging final result to the return value of the search
      const rawSearchResults = miniSearch.search(searchText);

      for (const rawSearchResult in rawSearchResults) {
        finalSearchResults.push({
          name: rawSearchResults[rawSearchResult].name,
          description: rawSearchResults[rawSearchResult].name + fileType,
          url: rawSearchResults[rawSearchResult].url,
        });
      }
    } else {
      result.forEach((element) => {
        if (element.endsWith(fileType) && element.toLowerCase().includes(searchText.toLowerCase())) {
          //Making sure only MD/org files are shown
          finalSearchResults.push({
            name: formatResult(element).replace(fileType, ""),
            description: formatResult(element),
            url: formatFilePath(element).replace(fileType, ""),
          });
        }
      });
    }
  });
  return finalSearchResults;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  score?: number;
  terms?: string[];
  description?: string;
  url: string;
}
