import { Image, List } from "@raycast/api";
import { useState } from "react";
import { action } from "./helpers/action";
import useLiveChannels from "./helpers/useLiveChannels";
import { CACHE_PREFIX } from "./helpers/cache";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import StreamerItem from "./interfaces/FollowingItem";

export default function main() {
  const [query, setQuery] = useState<string>("");
  const [searchHistory, setSearchHistory] = useCachedState<StreamerItem[]>(
    `${CACHE_PREFIX}_streamer_search_history`,
    [],
  );

  const { data: searchItems, isLoading } = useLiveChannels(query);

  const { data: sortedItems, visitItem } = useFrecencySorting(query ? searchItems : searchHistory, {
    key: (item) => item.id,
  });

  const onAction = (item: StreamerItem) => {
    visitItem(item);
    if (!searchHistory.some((game) => game.id === item.id)) {
      setSearchHistory([...searchHistory, item]);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a streamer..."
      onSearchTextChange={(text) => setQuery(text)}
    >
      {sortedItems.map((item) => {
        return (
          <List.Item
            key={item.id}
            icon={{ source: item.thumbnail_url, mask: Image.Mask.Circle }}
            id={item.id}
            title={item.title}
            subtitle={item.display_name}
            actions={action(item.broadcaster_login, item.is_live || false, () => onAction(item))}
          />
        );
      })}
    </List>
  );
}
