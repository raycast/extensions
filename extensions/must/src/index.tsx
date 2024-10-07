import React, { useState } from "react";
import { getPreferenceValues, ActionPanel, List, Icon, Action } from "@raycast/api";

// Types
import { Product } from "./types/ListResponse";

// Hooks
import useMust from "./hooks/useMust";
import { getFavicon } from "@raycast/utils";

const Raycast: React.FC = () => {
  const { username }: Preferences = getPreferenceValues();
  const { isLoading, list } = useMust(username);
  const [filter, setFilter] = useState("");

  // Render
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search entries..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Circle} title="All" value="" />
          <List.Dropdown.Item icon={Icon.List} title="Series" value="series" />
          <List.Dropdown.Item icon={Icon.FilmStrip} title="Movies" value="movies" />
        </List.Dropdown>
      }
    >
      {filter !== "movies" && (
        <List.Section title="Series" subtitle={String(list?.series.length)}>
          {list?.series.map((show) => <MustListItem key={show.id} item={show} />)}
        </List.Section>
      )}
      {filter !== "series" && (
        <List.Section title="Movies" subtitle={String(list?.movies.length)}>
          {list?.movies.map((movie) => <MustListItem key={movie.id} item={movie} />)}
        </List.Section>
      )}
    </List>
  );
};

const MustListItem: React.FC<{ item: Product }> = ({ item }) => (
  <List.Item
    title={item.title}
    icon={`https://image.tmdb.org/t/p/w342${item.poster_file_path}`}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`https://mustapp.com/p/${item.id}`} icon="command-icon.png" title="Open on Must" />
        {item.trailer_url && (
          <Action.OpenInBrowser
            url={item.trailer_url}
            icon={getFavicon(item.trailer_url)}
            title="Open Trailer on Youtube"
          />
        )}

        <Action.CopyToClipboard title="Copy Name to Clipboard" content={item.title} />
        <Action.CopyToClipboard title="Copy Must URL to Clipboard" content={`https://mustapp.com/p/${item.id}`} />
        {item.trailer_url && (
          <Action.CopyToClipboard title="Copy Trailer URL to Clipboard" content={item.trailer_url} />
        )}
      </ActionPanel>
    }
    accessories={[
      {
        text: item.items_count ? `${item.items_count} episodes` : undefined,
        icon: item.items_count ? Icon.Calendar : undefined,
      },
    ]}
    detail={
      <List.Item.Detail
        markdown={`![Poster](https://media.mustapp.me/must/posters/w342${item.poster_file_path}.jpg)`}
      />
    }
  />
);

export default Raycast;
