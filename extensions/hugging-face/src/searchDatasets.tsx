import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { API_URL } from "./constants";
import { useCachedState, useFetch } from "@raycast/utils";
import { Model } from "./models/models.model";
import { useDebouncedCallback } from "use-debounce";
import { addToHistory, getHistory, HistoryItem } from "./storage/history.storage";
import { EntityType, Preferences } from "./interfaces";
import { ListItem } from "./components/ListItem";
import { useFavorites } from "./hooks/useFavorites";
import { HistoryListItem } from "./components/HistoryListItem";

export default function SearchDatasets() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [history, setHistory] = useCachedState<HistoryItem[]>("historyDatasets", []);
  const [favorites, fetchFavorites] = useFavorites(EntityType.Dataset);

  const { showLinkToSearchResultsInListView, modelsResultsCount }: Preferences = getPreferenceValues();

  const { isLoading, data, revalidate } = useFetch<Model[]>(
    `${API_URL}datasets?full=true&config=true&limit=${modelsResultsCount}&search=${searchTerm.replace(/\s/g, "+")}`,
    {
      execute: false,
      onError: (error: Error) => {
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch datasets");
      },
      keepPreviousData: true,
    },
  );

  const debounced = useDebouncedCallback(
    async (value) => {
      const history = await addToHistory({ term: value, type: EntityType.Dataset });
      setHistory(history);
    },
    600,
    { debounceOnServer: true },
  );

  useEffect(() => {
    if (searchTerm) {
      debounced(searchTerm);
      revalidate();
    }
  }, [searchTerm]);

  useEffect(() => {
    async function fetchHistory() {
      const historyItems = await getHistory(EntityType.Dataset);
      setHistory(historyItems);
    }
    fetchHistory();
  }, []);

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={"Search datasets, like fineweb ..."}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.length ? (
            <>
              {showLinkToSearchResultsInListView ? (
                <List.Item
                  title={`View search results for "${searchTerm}" on huggingface.co`}
                  icon={Icon.MagnifyingGlass}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={`https://huggingface.co/datasets?sort=trending&search=${searchTerm}`}
                        title="View Hugging Face Search Results"
                      />
                    </ActionPanel>
                  }
                />
              ) : null}
              <List.Section title="Results" subtitle={data.length.toString()}>
                {data.map((model) => {
                  return (
                    <ListItem
                      key={model.id}
                      model={model}
                      type={EntityType.Dataset}
                      searchTerm={searchTerm}
                      setHistory={setHistory}
                      isFavorited={favorites.findIndex((item) => item.id === model.id) !== -1}
                      handleFavoriteChange={fetchFavorites}
                    />
                  );
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : (
        <>
          {history.length ? (
            <List.Section title="History">
              {history.map((item, index) => (
                <HistoryListItem
                  key={`${item.term}-${item.type}-${index}`}
                  item={item}
                  type={EntityType.Dataset}
                  setHistory={setHistory}
                  setSearchTerm={setSearchTerm}
                />
              ))}
            </List.Section>
          ) : (
            <List.EmptyView key={"empty"} title={"Type something to get started"} />
          )}
        </>
      )}
    </List>
  );
}
