import { formatDistanceToNow, isValid } from "date-fns";
import { useState } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { ResultsItem, SearchResult } from "./types";

const ListItem = ({ item }: { item: ResultsItem }) => {
  const date = item.fields.date ? new Date(Date.parse(item.fields.date)) : undefined;
  const accessories: List.Item.Accessory[] =
    date && isValid(date)
      ? [
          {
            tag: formatDistanceToNow(date, {}),
            icon: { source: Icon.Calendar, tintColor: Color.SecondaryText },
          },
        ]
      : [];

  return (
    <List.Item
      id={`${item.fields.post_id}`}
      title={item.fields["title.default"]}
      subtitle={item.highlight.content.join(" ").replace(/<[^>]*>?/gm, "")}
      icon={
        item.fields.post_type === "page"
          ? { source: Icon.Document, tintColor: Color.Green }
          : { source: Icon.Bookmark, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          {item.fields?.["permalink.url.raw"] ? (
            <Action.OpenInBrowser
              url={
                item.fields["permalink.url.raw"].startsWith("http")
                  ? item.fields["permalink.url.raw"]
                  : `https://${item.fields["permalink.url.raw"]}`
              }
              title="Open in Browser"
              icon={Icon.Globe}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
};

const Command = () => {
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useFetch<SearchResult>(
    `https://public-api.wordpress.com/rest/v1.3/sites/45537868/search?fields[0]=date&fields[1]=permalink.url.raw&fields[2]=tag.name.default&fields[3]=category.name.default&fields[4]=post_type&fields[5]=shortcode_types&fields[6]=forum.topic_resolved&fields[7]=has.image&fields[8]=image.url.raw&fields[9]=image.alt_text&highlight_fields[0]=title&highlight_fields[1]=content&highlight_fields[2]=comments&filter[bool][must][0][bool][should][0][term][post_type]=post&filter[bool][must][0][bool][should][1][term][post_type]=page&filter[bool][must][0][bool][should][2][term][post_type]=newsletters&filter[bool][must][0][bool][should][3][term][post_type]=chapters&filter[bool][must][1][bool][must_not][0][term][post_type]=attachment&query=${query}&sort=score_default&size=20`,
    {
      execute: query.length > 0,
      keepPreviousData: false,
    },
  );

  return (
    <List isLoading={isLoading} searchText={query} onSearchTextChange={setQuery} throttle>
      {error && (
        <List.EmptyView title="Failed to load data" description={error.message} icon={{ source: "csstricks.svg" }} />
      )}
      {!error && !isLoading && query.length > 0
        ? data?.results.map((res) => <ListItem key={res.fields.post_id} item={res} />)
        : null}
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
