import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const API_URL = "https://wpbones.com/api/search?q=";

interface Document {
  title: string;
  content: string;
  items: Array<Item>;
}

interface Item {
  title: string;
  url: string;
  excerpt: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const shouldFetch = searchText.trim().length >= 3;

  const { data, error, isLoading } = useFetch<Document[]>(
    shouldFetch ? `${API_URL}${encodeURIComponent(searchText)}` : "",
    {
      execute: shouldFetch,
      keepPreviousData: true,
    },
  );

  const entries = Array.isArray(data) ? data.filter((d): d is Document => "title" in d && "items" in d) : [];

  return (
    <List
      isShowingDetail={entries.length > 0}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WP Bones documentation..."
      throttle
    >
      {!shouldFetch && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Type to search" description="Enter at least 3 characters" />
      )}

      {shouldFetch && error && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: "red" }}
          title="Failed to search"
          description={error.message}
        />
      )}

      {shouldFetch && !error && entries.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.XMarkCircle} title="No results" description={`No results for "${searchText}"`} />
      )}

      {entries.map((d, i) => (
        <List.Section key={`doc-section-${i}`} title={d.title}>
          {d.items.map((item: Item, j: number) => (
            <List.Item
              key={`doc-${i}-item-${j}`}
              icon={Icon.Book}
              title={item.title}
              actions={
                <ActionPanel title={item.title}>
                  <Action.OpenInBrowser url={item.url.replace(/\.html/g, "")} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.url.replace(/\.html/g, "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
              detail={<List.Item.Detail markdown={item.excerpt} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
