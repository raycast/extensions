import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { useState } from "react";

interface Preferences {
  top_level_domain: string;
}

interface AutocompleteResponse {
  suggestions: { value: string }[];
}

async function autoComplete(searchQuery: string, tld: string, marketplaceID: string): Promise<string[]> {
  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://completion.amazon.${tld}/api/2017/suggestions?alias=aps&mid=${marketplaceID}&prefix=${encodedQuery}`;

    const response = await fetch(url);
    const data = (await response.json()) as AutocompleteResponse;

    return data.suggestions.map((suggestion) => suggestion.value).filter((value: string) => value !== searchQuery);
  } catch (error) {
    console.error("Error fetching autocomplete data", error);
    showToast(Toast.Style.Failure, "Failed to fetch autocomplete data");
    return [];
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

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
  const [items, setItems] = useState<string[]>([]);

  const preferences: Preferences = getPreferenceValues();

  const search = async (query: string) => {
    setSearchText(query);
    if (query.length === 0) {
      // Clear the autocomplete results if the search text is empty
      setItems([]);
      return;
    }

    const tld = preferences.top_level_domain;
    const mid = marketplaceIDs[tld];

    const results = await autoComplete(query, tld, mid);
    setItems(results);
  };

return (
  <List
    onSearchTextChange={search}
    isLoading={searchText.length > 0 && items.length === 0}
    searchBarPlaceholder="Search Amazon..."
  >
    {items.length === 0 ? (
      <List.EmptyView
        icon="amazon-emptyview.png"
        title="No Results"
      />
    ) : (
      items.map((item, index) => (
        <List.Item
          key={index}
          title={item}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://www.amazon.${preferences.top_level_domain}/s?k=${encodeURIComponent(item)}`}
              />
            </ActionPanel>
          }
        />
      ))
    )}
  </List>
);
}
