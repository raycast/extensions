import { useState } from "react";

import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface ResultItem {
  id: number;
  title: string;
  url: string;
  subtype: "page" | "post";
}

const ItemDetails = ({ item }: { item: ResultItem }) => {
  interface DetailItem {
    date: string;
    link: string;
    title: {
      rendered: string;
    };
    excerpt: {
      rendered: string;
      protected: boolean;
    };
  }
  const { data, isLoading, error } = useFetch<DetailItem>(
    `https://css-tricks.com/wp-json/wp/v2/${item.subtype}s/${item.id}?` +
      new URLSearchParams({
        context: "embed",
        _fields: "date,link,title,excerpt",
      }).toString(),
  );

  const markdown = isLoading
    ? "Loading..."
    : error
      ? error.message
      : data
        ? `# ${data.title.rendered} \n\n Date: ${data.date} \n\n Type: ${item.subtype} \n\n --- \n\n ${data.excerpt.rendered}`
        : "";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={<ActionPanel>{data && <Action.OpenInBrowser url={data.link} />}</ActionPanel>}
    />
  );
};

const ListItem = ({ item }: { item: ResultItem }) => {
  return (
    <List.Item
      id={`${item.id}`}
      title={item.title}
      icon={
        item.subtype === "page"
          ? { source: Icon.Document, tintColor: Color.Green }
          : { source: Icon.Bookmark, tintColor: Color.SecondaryText }
      }
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Eye} title="View Details" target={<ItemDetails item={item} />} />
          <Action.OpenInBrowser url={item.url} title="Open in Browser" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
};

const Command = () => {
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useFetch(
    `https://css-tricks.com/wp-json/wp/v2/search?` +
      new URLSearchParams({
        type: "post",
        per_page: "20",
        _fields: "id,title,url,subtype",
        search: query,
      }).toString(),
    {
      mapResult(result: ResultItem[]) {
        return {
          data: result,
        };
      },
      execute: query.length > 0,
      keepPreviousData: false,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search posts and pages"
    >
      {error && (
        <List.EmptyView title="Failed to load data" description={error.message} icon={{ source: "csstricks.svg" }} />
      )}
      {!error && !isLoading && query.length > 0 ? data?.map((res) => <ListItem key={res.id} item={res} />) : null}
      {!error && (
        <List.EmptyView
          title={
            query.length > 0
              ? isLoading
                ? "Loading data..."
                : "No results found"
              : "Start searching by typing in the search bar above"
          }
          icon={{ source: "csstricks.svg" }}
        />
      )}
    </List>
  );
};

export default Command;
