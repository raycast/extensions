import { Action, ActionPanel, Grid } from "@raycast/api";
import { useState } from "react";

import Game from "./interfaces/Game";
import useLiveGames from "./helpers/useLiveGames";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { CACHE_PREFIX } from "./helpers/cache";

export default function main() {
  const [query, setQuery] = useState<string>("");
  const [searchHistory, setSearchHistory] = useCachedState<Game[]>(`${CACHE_PREFIX}_game_search_history`, []);

  const { data: searchItems, isLoading } = useLiveGames(query);

  const { data: sortedItems, visitItem } = useFrecencySorting(query ? searchItems : searchHistory, {
    key: (item) => item.id,
  });

  const onAction = (item: Game) => {
    visitItem(item);
    if (!searchHistory.some((game) => game.id === item.id)) {
      setSearchHistory([...searchHistory, item]);
    }
  };

  return (
    <Grid
      isLoading={isLoading && searchItems.length === 0}
      searchBarPlaceholder="Search for game..."
      onSearchTextChange={(text) => setQuery(text)}
      columns={5}
    >
      {sortedItems.map((item: Game) => {
        return (
          <Grid.Item
            content={item.box_art_url.replace("52x72", "285x380")}
            key={item.id}
            id={item.id}
            title={item.name}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open Category"
                  target={`https://twitch.tv/directory/game/${encodeURIComponent(item.name)}`}
                  onOpen={() => onAction(item)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
