import { Alert, Icon, List, confirmAlert, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";
import { ListEmptyView } from "./components/ListEmptyView";
import { RecentSearchListItem } from "./components/RecentSearchListItem";
import { SuggestionListItem } from "./components/SuggestionListItem";
import { MARKETPLACE_IDS, MAX_RECENT_SEARCHES } from "./constants";

interface Preferences {
  top_level_domain: string;
}

interface AutocompleteResponse {
  suggestions: { value: string }[];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useCachedState<string[]>("recentSearches", []);

  const preferences: Preferences = getPreferenceValues();
  const tld = preferences.top_level_domain;
  const mid = MARKETPLACE_IDS[tld];

  const url = `https://completion.amazon.${tld}/api/2017/suggestions?alias=aps&mid=${mid}&prefix=${encodeURIComponent(
    searchText,
  )}`;

  const { isLoading, data } = useFetch<AutocompleteResponse>(url, {
    execute: searchText.length > 0,
    keepPreviousData: true,
  });

  const handleSearchOpen = (text: string) => {
    const updatedSearches = [text, ...recentSearches.filter((item) => item !== text)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updatedSearches);
  };

  const handleRemoveSearchItem = (text: string) => {
    setRecentSearches(recentSearches.filter((item) => item !== text));
  };

  const handleClearSearchHistory = async () => {
    const isConfirmed = await confirmAlert({
      title: "Clear all recent searches?",
      icon: Icon.Trash,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (isConfirmed) {
      setRecentSearches([]);
    }
  };

  const suggestions = data
    ? data.suggestions.map((suggestion) => suggestion.value).includes(searchText)
      ? data.suggestions.map((suggestion) => suggestion.value)
      : [searchText, ...data.suggestions.map((suggestion) => suggestion.value)]
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Amazon..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length > 0 && (
        <List.Section title="Suggestions" subtitle={`${suggestions.length}`}>
          {suggestions.map((item, index) => (
            <SuggestionListItem key={index} item={item} tld={tld} onOpen={handleSearchOpen} />
          ))}
        </List.Section>
      )}

      {searchText.length === 0 && (
        <List.Section title="Recent Searches">
          {recentSearches.map((item, index) => (
            <RecentSearchListItem
              key={index}
              item={item}
              tld={tld}
              onRemove={handleRemoveSearchItem}
              onClearHistory={handleClearSearchHistory}
            />
          ))}
        </List.Section>
      )}

      <ListEmptyView />
    </List>
  );
}
