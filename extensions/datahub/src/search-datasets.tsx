import React, { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { searchGraphForEntity, getUrlForDataset, SearchResult } from "./utils/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const {
    data: searchResults,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (query) => {
      if (!query) return [];
      return await searchGraphForEntity(query);
    },
    [searchText],
    {
      onError: async (error) => {
        await showFailureToast(error, {
          title: "Failed to search Datahub",
          message: String(error),
        });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for datasets..."
      throttle
    >
      {searchResults?.length === 0 && searchText !== "" ? (
        <List.EmptyView title="No results found" icon={Icon.XMarkCircle} />
      ) : (
        searchResults?.map((result: SearchResult) => (
          <List.Item
            key={result.entity.urn}
            title={result.entity.name}
            subtitle={result.entity.platform.name}
            accessories={[{ text: "Dataset" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Datahub" url={getUrlForDataset(result.entity.urn)} />
                <Action.CopyToClipboard title="Copy URL" content={getUrlForDataset(result.entity.urn)} />
                <Action.CopyToClipboard title="Copy Urn" content={result.entity.urn} />
                <Action title="Refresh Results" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
