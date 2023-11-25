/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "../types";
import APIData from "../data/apis";
import { useAlgolia, useMeilisearch } from "../hooks";

import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { getTitleForAlgolis, getTitleForMeilisearch } from "../utils/getTitle";
import { generateContent } from "../utils";

export function SearchDocumentation(props: { id: string; quickSearch?: string }) {
  const currentAPI = APIData.find((api) => props.id === api.id) as API;

  const [searchText, setSearchText] = useState(props.quickSearch || "");
  const [currentIdx, setCurrentIdx] = useState(0);

  let isLoading = false;
  let searchResults: Array<any> = [];
  let showDetailList: Array<boolean> = [];

  if (currentAPI.type === "algolia") {
    const res = useAlgolia(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults.map((item, index) => ({
      ...item,
      title: getTitleForAlgolis(item),
      id: `${index}`,
    }));
    showDetailList = searchResults.map((item) => item.content != null || item.subtitle != null);
  } else if (currentAPI.type === "meilisearch") {
    const res = useMeilisearch(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults.map((item, index) => ({
      ...item,
      title: getTitleForMeilisearch(item),
      id: `${index}`,
    }));
    showDetailList = searchResults.map((item) => item.content != null || item.subtitle != null);
  }

  return (
    <List
      throttle={true}
      navigationTitle={currentAPI.name}
      isLoading={isLoading || searchResults === undefined}
      isShowingDetail={showDetailList[currentIdx]}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      onSelectionChange={(id) => {
        setCurrentIdx(parseInt(id || "0"));
      }}
    >
      {searchResults?.map((result) => (
        <List.Item
          icon={result.content == null && result.subtitle == null ? Icon.Hashtag : Icon.Paragraph}
          key={result.objectID}
          id={result.id}
          title={result.title}
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
          detail={<List.Item.Detail markdown={showDetailList[currentIdx] ? generateContent(result) : ""} />}
        />
      ))}
    </List>
  );
}
