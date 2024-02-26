import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useState } from "react";

interface Preferences {
  top_level_domain: string;
}

interface AutocompleteResponse {
  suggestions: { value: string }[];
}

const MAX_RECENT_SEARCHES = 7;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useCachedState<string[]>("recentSearches", []);

  const preferences: Preferences = getPreferenceValues();
  const tld = preferences.top_level_domain;
  const marketplaceIDs: { [key: string]: string } = {
    "com.au": "A39IBJ37TRP1C6",
    "com.be": "AMEN7PMS3EDWL",
    "com.br": "A2Q3Y263D00KWC",
    ca: "A2EUQ1WTGCTBG2",
    cn: "AAHKV2X7AFYLW",
    fr: "A13V1IB3VIYZZH",
    de: "A1PA6795UKMFR9",
    eg: "ARBP9OOSHTCHU",
    in: "A21TJRUUN4KGV",
    it: "APJ6JRA9NG5V4",
    "co.jp": "A1VC38T7YXB528",
    "com.mx": "A1AM78C64UM0Y8",
    nl: "A1805IZSGTT6HS",
    pl: "A1C3SOZRARQ6R3",
    sa: "A17E79C6D8DWNP",
    sg: "A19VAU5U5O7RUS",
    es: "A1RKKUPIHCS9HS",
    se: "A2NODRKZP88ZB9",
    "com.tr": "A33AVAJ2PDY3EV",
    "co.uk": "A1F83G8C2ARO7P",
    com: "ATVPDKIKX0DER",
  };
  const mid = marketplaceIDs[tld];

  const url = `https://completion.amazon.${tld}/api/2017/suggestions?alias=aps&mid=${mid}&prefix=${encodeURIComponent(
    searchText,
  )}`;

  const { data, isLoading } = useFetch<AutocompleteResponse>(url, {
    execute: searchText.length > 0,
    keepPreviousData: true,
  });

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text && !recentSearches.includes(text)) {
      const updatedSearches = [text, ...recentSearches].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updatedSearches);
    }
  };

  const handleRemoveSearchItem = (query: string) => {
    setRecentSearches(recentSearches.filter((item) => item !== query));
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

  const suggestions = data ? data.suggestions.map((suggestion) => suggestion.value) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Amazon..." onSearchTextChange={handleSearch} throttle>
      {searchText.length > 0 && (
        <List.Section title="Suggestions" subtitle={`${suggestions.length}`}>
          {suggestions.map((item, index) => (
            <List.Item
              key={index}
              title={item}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://www.amazon.${tld}/s?k=${encodeURIComponent(item)}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {searchText.length === 0 && (
        <List.Section title="Recent Searches">
          {recentSearches.map((item, index) => (
            <List.Item
              key={index}
              title={item}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://www.amazon.${tld}/s?k=${encodeURIComponent(item)}`} />
                  <Action
                    title="Remove Search Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveSearchItem(item)}
                  />
                  <Action
                    title="Clear Search History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearSearchHistory}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.EmptyView
        icon={{ source: "amazon-emptyview.png", tintColor: Color.SecondaryText }}
        title="What's on your wishlist?"
      />
    </List>
  );
}
