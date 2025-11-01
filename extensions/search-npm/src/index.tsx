import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import type { FetchResponseObject, NpmFetchResponse } from "@/model/npmResponse.model";
import { addToHistory, getHistory } from "@/utils/history-storage";
import type { HistoryItem } from "@/utils/history-storage";
import { useFavorites } from "@/hooks/useFavorites";
import { HistoryListItem } from "@/components/HistoryListItem";
import { PackageListItem } from "@/components/PackagListItem";

const API_PATH = "https://registry.npmjs.org/-/v1/search?text=";

export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);
  const [favorites, fetchFavorites] = useFavorites();
  const { historyCount, showLinkToSearchResultsInListView } = getPreferenceValues<ExtensionPreferences>();

  const { isLoading, data, revalidate } = useFetch<FetchResponseObject[]>(
    `${API_PATH}${searchTerm.replace(/\s/g, "+")}`,
    {
      execute: !!searchTerm,
      onError: (error) => {
        if (searchTerm) {
          console.error(error);
          showToast(Toast.Style.Failure, "Could not fetch packages");
        }
      },
      parseResponse: async (response) => {
        return ((await response.json()) as NpmFetchResponse).objects;
      },
      keepPreviousData: true,
    },
  );

  const debounced = useDebouncedCallback(
    async (value) => {
      const history = await addToHistory({ term: value, type: "search" });
      setHistory(history);
    },
    600,
    { debounceOnServer: true },
  );

  useEffect(() => {
    if (searchTerm) {
      debounced(searchTerm);
    } else {
      revalidate();
    }
  }, [searchTerm]);

  useEffect(() => {
    async function fetchHistory() {
      const historyItems = await getHistory();
      setHistory(historyItems);
    }
    fetchHistory();
  }, []);

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.length ? (
            <>
              {showLinkToSearchResultsInListView ? (
                <List.Item
                  title={`View search results for "${searchTerm}" on npmjs.com`}
                  icon={Icon.MagnifyingGlass}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://www.npmjs.com/search?q=${searchTerm}`}
                        title="View npm Search Results"
                      />
                    </ActionPanel>
                  }
                />
              ) : null}
              <List.Section title="Results" subtitle={data.length.toString()}>
                {data.map((result) => {
                  if (!result.package.name) {
                    return null;
                  }
                  return (
                    <PackageListItem
                      key={`search-${result.package.name}`}
                      result={result.package}
                      searchTerm={searchTerm}
                      setHistory={setHistory}
                      isFavorited={favorites.findIndex((item) => item.name === result.package.name) !== -1}
                      handleFaveChange={fetchFavorites}
                    />
                  );
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : (
        <>
          {Number(historyCount) > 0 ? (
            history.length ? (
              <List.Section title="History">
                {history.map((item) => {
                  if (item.type === "package" && item?.package?.name) {
                    const pkgName = item.package.name;
                    return (
                      <PackageListItem
                        key={`history-${pkgName}`}
                        result={item.package}
                        searchTerm={searchTerm}
                        setHistory={setHistory}
                        isFavorited={favorites.findIndex((fave) => fave.name === pkgName) !== -1}
                        handleFaveChange={fetchFavorites}
                        isHistoryItem={true}
                      />
                    );
                  }

                  return (
                    <HistoryListItem
                      key={`history-${item.term}-${item.type}`}
                      item={item}
                      setHistory={setHistory}
                      setSearchTerm={setSearchTerm}
                    />
                  );
                })}
              </List.Section>
            ) : (
              <List.EmptyView title="Type something to get started" />
            )
          ) : null}
        </>
      )}
    </List>
  );
}
