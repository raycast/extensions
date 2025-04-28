import { List, LocalStorage } from "@raycast/api";
import { ComponentProps, useEffect, useState } from "react";
import { debounce } from "./helpers/debounce";
import { useCachedPromise } from "@raycast/utils";
import { useSearch } from "./hooks/useSearch";
import { SearchDropdownList } from "./types";
import { SearchCommand } from "./components/searchCommand";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<SearchDropdownList["value"]>("all");

  const {
    data: recentSearchData,
    isLoading,
    revalidate: revalidateRecentSearch,
  } = useCachedPromise(async () => LocalStorage.getItem<string>("recent-searches"), []);

  const recentSearches: string[] = recentSearchData ? JSON.parse(recentSearchData) : [];

  const { searchData, searchIsLoading } = useSearch(searchText, searchFilter);

  useEffect(() => {
    if (searchText.length >= 3 && recentSearches.includes(searchText.trim()) === false && searchIsLoading === false) {
      const addToHistory = debounce(async () => {
        LocalStorage.setItem("recent-searches", JSON.stringify([searchText, ...recentSearches]));
        revalidateRecentSearch();
      }, 2000);

      addToHistory();
    }
  }, [searchText, searchIsLoading]);

  const onSearchFilterChange = (newValue: string) => {
    setSearchFilter(newValue);
  };

  const searchAgain = async (search: string) => {
    setSearchText(search);
  };

  // configurations
  const sharedProps: ComponentProps<typeof List> = {
    searchText,
    throttle: true,
    onSearchTextChange: setSearchText,
    navigationTitle: "Search",
    isLoading: searchIsLoading || isLoading || searchData === undefined,
    searchBarPlaceholder: "What do you want to listen to?",
  };

  return (
    <SearchCommand
      {...{
        searchText,
        searchData,
        searchAgain,
        recentSearches,
        sharedProps,
        onSearchFilterChange,
        revalidateRecentSearch,
      }}
    />
  );
}
