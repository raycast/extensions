import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { TranslationResult } from "./search-tureng";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch<string[]>(`https://ac.tureng.co/?t=${encodeURIComponent(searchText.trim())}`, {
    execute: searchText.trim().length > 0,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search Tureng..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {data?.map((suggestion) => (
        <List.Item
          key={suggestion}
          icon={Icon.MagnifyingGlass}
          title={suggestion}
          actions={
            <ActionPanel>
              <Action.Push title="Look up" icon={Icon.Book} target={<TranslationResult word={suggestion} />} />
              <Action.CopyToClipboard content={suggestion} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
