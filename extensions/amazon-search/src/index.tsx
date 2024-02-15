import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Preferences {
  top_level_domain: string;
}

interface AutocompleteResponse {
  suggestions: { value: string }[];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

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

  const items = data ? data.suggestions.map((suggestion) => suggestion.value) : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Amazon..." onSearchTextChange={setSearchText} throttle>
      <List.Section title="Suggestions" subtitle={`${items.length}`}>
        {items.map((item, index) => (
          <List.Item
            key={index}
            title={item}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.amazon.${tld}/s?k=${encodeURIComponent(item)}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView icon="amazon-emptyview.png" title="No Results" />
    </List>
  );
}
