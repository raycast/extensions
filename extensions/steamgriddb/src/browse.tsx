import { Action, ActionPanel, List } from "@raycast/api";
import debounce from "lodash/debounce.js";
import { LaunchOptions } from "raycast-cross-extension";
import { useEffect, useState } from "react";
import { ImagePreview } from "./components.js";
import { SGDBGame } from "./types.js";
import { db } from "./utils.js";

type LaunchContext = {
  steamAppId?: number;
  callbackLaunchOptions?: LaunchOptions;
};

export default function Browse({
  launchContext = {},
}: {
  launchContext?: LaunchContext;
}) {
  const { steamAppId } = launchContext;
  const [searchString, setSearchString] = useState("");
  const [games, setGames] = useState<SGDBGame[]>([]);
  const [game, setGame] = useState<SGDBGame>();
  const [isLoading, setIsLoading] = useState(steamAppId ? true : false);

  const fetchGames = async (searchString: string) => {
    if (!searchString) return;
    setIsLoading(true);
    const games = await db.searchGame(searchString).catch(() => []);
    setGames(games);
    setIsLoading(false);
  };

  const loadSteamGame = async (steamAppId: number) => {
    setIsLoading(true);
    const game = await db
      .getGameBySteamAppId(steamAppId)
      .catch(() => undefined);
    setGame(game);
    setIsLoading(false);
  };

  useEffect(() => {
    if (steamAppId) {
      loadSteamGame(steamAppId);
    }
  }, []);

  useEffect(() => {
    fetchGames(searchString);
  }, [searchString]);

  if (steamAppId) {
    if (game) return <ImagePreview game={game} />;
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="No SteamGridDB data found" />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={debounce(setSearchString, 300)}
    >
      {searchString && !isLoading ? (
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
