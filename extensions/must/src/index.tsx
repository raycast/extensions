import React, { useState } from "react";
import { getPreferenceValues, ActionPanel, List, Icon, Action, Keyboard } from "@raycast/api";

// Types
import { Product } from "./types/ListResponse";

// Hooks
import useMust from "./hooks/useMust";
import { useCachedState } from "@raycast/utils";

const Raycast: React.FC = () => {
  const { username }: Preferences = getPreferenceValues();
  const { isLoading, list } = useMust(username);
  const [filter, setFilter] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  // Render
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
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
          {list?.series.map((show) => (
            <MustListItem key={show.id} item={show} toggleDetails={() => setIsShowingDetail((prev) => !prev)} />
          ))}
        </List.Section>
      )}
      {filter !== "series" && (
        <List.Section title="Movies" subtitle={String(list?.movies.length)}>
          {list?.movies.map((movie) => (
            <MustListItem key={movie.id} item={movie} toggleDetails={() => setIsShowingDetail((prev) => !prev)} />
          ))}
        </List.Section>
      )}
    </List>
  );
};

const MustListItem: React.FC<{ item: Product; toggleDetails: () => void }> = ({ item, toggleDetails }) => {
  const poster = `https://image.tmdb.org/t/p/w342${item.poster_file_path}`;
  return (
    <List.Item
      title={item.title}
      icon={poster}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://mustapp.com/p/${item.id}`} icon="command-icon.png" title="Open on Must" />
          {item.trailer_url && (
            <Action.OpenInBrowser url={item.trailer_url} icon="yt.png" title="Open Trailer on Youtube" />
          )}
          <Action
            icon={Icon.AppWindowSidebarLeft}
            title="Toggle Poster"
            onAction={toggleDetails}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />

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
      detail={<List.Item.Detail markdown={`![Poster](${poster})`} />}
    />
  );
};

export default Raycast;
