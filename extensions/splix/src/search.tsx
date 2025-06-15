import {
  List,
  ActionPanel,
  Action,
  showToast,
  ToastStyle,
  LocalStorage,
  open,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";

const LOCAL_STORAGE_SEARCH_HISTORY_KEY = "splix-search-history";

type History = {
  search: string;
  date: number;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [searchHistory, setSearchHistory] = useState<History[]>([]);

  useEffect(() => {
    const fetchSearchHistory = async () => {
      const history = await LocalStorage.getItem(LOCAL_STORAGE_SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history as unknown as string));
      }
    };
    fetchSearchHistory();
  }, []);

  function dropDuplicates(newHistory: History[]) {
    const uniqueSearches = new Set();
    return newHistory.filter((item) => {
      const searchString = item.search;
      if (uniqueSearches.has(searchString)) {
        return false;
      } else {
        uniqueSearches.add(searchString);
        return true;
      }
    });
  }

  const handleSearch = async (search: string) => {
    if (search.trim() === "") {
      await showToast(ToastStyle.Failure, "Search text cannot be empty");
      return;
    }

    const newHistory = dropDuplicates([{ search, date: new Date().getTime() }, ...searchHistory]).slice(0, 100);

    LocalStorage.setItem(LOCAL_STORAGE_SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    setSearchHistory(newHistory);

    const url = `https://splix.app/dashboard?search=${encodeURIComponent(search)}`;
    open(url);
    closeMainWindow();
  };

  const handleDeleteSearh = (search: string) => {
    const newHistory = searchHistory.filter((obj) => obj.search !== search);
    setSearchHistory(newHistory);
    LocalStorage.setItem(LOCAL_STORAGE_SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const searchResults = useMemo(
    () => searchHistory.filter((item) => item.search.includes(searchText)),
    [searchHistory, searchText],
  );

  return (
    <List
      searchBarPlaceholder="Search Splix..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Search Splix..." onAction={() => handleSearch(searchText)} />
        </ActionPanel>
      }
    >
      <List.EmptyView title={searchText ? "Press enter to search!" : "Previous searches will appear here."} />
      <List.Section title="Results" subtitle={searchResults.length + ""}>
        {searchResults.map((item, index) => (
          <List.Item
            icon={Icon.MagnifyingGlass}
            key={index}
            title={item.search}
            accessories={[{ icon: Icon.Calendar, text: new Date(item.date).toDateString() }]}
            actions={
              <ActionPanel>
                <Action icon={Icon.Globe} title="Search in Splix" onAction={() => handleSearch(item.search)} />
                <Action icon={Icon.Trash} title="Delete Search" onAction={() => handleDeleteSearh(item.search)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
