import { Action, ActionPanel, List } from "@raycast/api";
import debounce from "lodash/debounce.js";
import { useEffect, useState } from "react";
import { ImagePreview } from "./components.js";
import { SGDBGame } from "./types.js";
import { db } from "./utils.js";

export default function Browse() {
  const [searchString, setSearchString] = useState("");
  const [games, setGames] = useState<SGDBGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchGames = async (searchString: string) => {
    if (!searchString) return;
    setIsSearching(true);
    const games = await db.searchGame(searchString).catch(() => []);
    setGames(games);
    setIsSearching(false);
  };

  useEffect(() => {
    fetchGames(searchString);
  }, [searchString]);

  return (
    <List
      isLoading={isSearching}
      onSearchTextChange={debounce(setSearchString, 300)}
    >
      {searchString && !isSearching ? (
        games.map((game) => (
          <List.Item
            key={game.id.toString()}
            title={game.name}
            accessories={game.types.map((text) => ({ tag: text }))}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Grids"
                  target={<ImagePreview game={game} />}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Start Browsing"
          description="Search for a game to view its images"
        />
      )}
    </List>
  );
}
