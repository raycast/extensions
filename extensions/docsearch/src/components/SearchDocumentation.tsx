/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, data, DocID } from "../data/apis";
import { useAlgolia, useMeilisearch } from "../hooks";

import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { getTitleForAlgolis, getTitleForMeilisearch } from "../utils/getTitle";
import { generateContent } from "../utils";

export function SearchDocumentation(props: { id: DocID; quickSearch?: string }) {
  const currentDocs = data[props.id] as Readonly<{ [key in string]: API }>;
  const tags = useMemo(() => Object.keys(currentDocs), [currentDocs]);
  const [searchText, setSearchText] = useState(props.quickSearch || "");
  const [searchTag, setSearchTag] = useState<string>(tags[0]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentAPI = currentDocs[searchTag] as Readonly<API>;

  let isLoading = false;
  let searchResults: Array<any> = [];

  if (currentAPI.type === "algolia") {
    const res = useAlgolia(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults.map((item, index) => {
      item.title = getTitleForAlgolis(item);

      return {
        ...item,
        content: generateContent(item),
        id: `${index}`,
      };
    });
  } else if (currentAPI.type === "meilisearch") {
    const res = useMeilisearch(searchText, currentAPI);
    isLoading = res.isLoading;
    searchResults = res.searchResults.map((item, index) => ({
      ...item,
      title: getTitleForMeilisearch(item),
      id: `${index}`,
    }));
  }

  return (
    <List
      throttle={true}
      navigationTitle={DocID[props.id] || "No Title"}
      isLoading={isLoading || searchResults === undefined}
      isShowingDetail={searchResults?.[currentIdx]?.content != undefined}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      onSelectionChange={(id) => {
        setCurrentIdx(parseInt(id || "0"));
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Tag"
          storeValue
          onChange={(tag) => {
            setSearchTag(tag);
            setCurrentIdx(0);
          }}
        >
          {tags.map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {searchResults?.map((result) => {
        return (
          <List.Item
            icon={result.content == null && result.subtitle == null ? Icon.Hashtag : Icon.Paragraph}
            key={result.objectID}
            id={result.id}
            title={result.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={result.url?.indexOf("%") !== -1 ? result.url : encodeURI(result.url)}
                  title="Open in Browser"
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={result.url?.indexOf("%") !== -1 ? decodeURI(result.url) : result.url}
                />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={result.content} />}
          />
        );
      })}
    </List>
  );
}
