/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../types";
import APIData from "../data/apis";
import { useAlgolia, useMeilisearch } from "../hooks";

import { ActionPanel, List, Action } from "@raycast/api";
import { useState } from "react";
import { getTitleForAlgolis, getTitleForMeilisearch } from "../utils/getTitle";

export function SearchDocumentation(props: { id: string; quickSearch?: string }) {
  const currentAPI = APIData.find((api) => props.id === api.id) as API;

  const [searchText, setSearchText] = useState(props.quickSearch || "");

  let isLoading = false;
  let searchResults: Array<any> = [];

  if (currentAPI.type === "algolia") {
    const res = useAlgolia(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults;
  } else if (currentAPI.type === "meilisearch") {
    const res = useMeilisearch(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults;
  }

  return (
    <List
      throttle={true}
      navigationTitle={currentAPI.name}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {searchResults?.map((result) => (
        <List.Item
          icon={currentAPI.icon}
          key={result.objectID}
          title={currentAPI.type === "algolia" ? getTitleForAlgolis(result) : getTitleForMeilisearch(result)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={result.url.indexOf("%") !== -1 ? result.url : encodeURI(result.url)}
                title="Open in Browser"
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={result.url.indexOf("%") !== -1 ? decodeURI(result.url) : result.url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
