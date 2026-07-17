import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import type { NpmFetchResponse } from "@/model/npmResponse.model";
import { addToHistory, getHistory } from "@/utils/history-storage";
import type { HistoryItem } from "@/utils/history-storage";
import { useFavorites } from "@/hooks/useFavorites";
import { HistoryListItem } from "@/components/HistoryListItem";
import { PackageListItem } from "@/components/PackagListItem";

// https://api-docs.npmjs.com/#tag/Search/operation/getsearch
const API_PATH = "https://registry.npmjs.org/-/v1/search";

export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);
  const [favorites, fetchFavorites] = useFavorites();
  const { historyCount, showLinkToSearchResultsInListView, size } = getPreferenceValues<Preferences.Index>();
  const [total, setTotal] = useState(0);
  const pageSize = Math.max(1, Number.parseInt(size, 10) || 20);

  // If the search term is empty or only 1 character - the request will always result in 'Bad Request' error, so there's no reason to make it
  const canSearch = Boolean(debouncedSearchTerm) && debouncedSearchTerm.length > 1;

  const { isLoading, data, pagination } = useCachedPromise(
    (term: string, searchPageSize: number) =>
      async ({ page }: { page: number }) => {
        const from = page * searchPageSize;
        const url = `${API_PATH}?${new URLSearchParams({
          text: term,
          size: String(searchPageSize),
          from: String(from),
        })}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`npm search request failed with status ${response.status}`);
        }

        const json = (await response.json()) as NpmFetchResponse;
        setTotal(json.total);

        return {
          data: json.objects ?? [],
          hasMore: from + (json.objects?.length ?? 0) < json.total,
        };
      },
    [debouncedSearchTerm, pageSize],
    {
      execute: canSearch,
      keepPreviousData: true,
      initialData: [],
      onError: (error: unknown) => {
        if (debouncedSearchTerm) {
          console.error(error);
          showToast(Toast.Style.Failure, "Could not fetch packages");
        }
      },
    },
  );

  const debouncedUpdateHistory = useDebouncedCallback(
    async (value) => {
      const history = await addToHistory({ term: value, type: "search" });
      setHistory(history);
    },
    600,
    { debounceOnServer: true },
  );

  const debouncedUpdateSearchTerm = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchTerm(value.trim());
    },
    500,
    { debounceOnServer: true },
  );

  useEffect(() => {
    debouncedUpdateSearchTerm(searchTerm);
    if (searchTerm) {
      debouncedUpdateHistory(searchTerm);
    } else {
      setTotal(0);
      debouncedUpdateHistory.cancel();
      debouncedUpdateSearchTerm.cancel();
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
      pagination={canSearch ? pagination : undefined}
      searchBarPlaceholder={`Search packages, like "promises"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data.length ? (
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
              <List.Section
                title="Results"
                subtitle={data.length > total ? `${data.length}` : `${data.length} / ${total}`}
              >
                {data.map((result) => {
                  if (!result.package.name) {
                    return null;
                  }
                  return (
                    <PackageListItem
                      key={`search-${result.package.name}`}
                      result={result.package}
                      downloads={result.downloads}
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
