import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getFaviouriteGames } from "./modules/favourite-games";
import { useBatchGameDetails } from "./hooks/batch-game-details";
import { GameData, GamesListItem } from "./components/games-list";

export default () => {
  const { data: universes, isLoading: universesLoading, revalidate } = usePromise(getFaviouriteGames);
  const [gameIds, setGameIds] = useState<number[]>([]);

  useEffect(() => {
    if (universes) {
      setGameIds(universes);
    }
  }, [universes]);

  const { data: gameDetails } = useBatchGameDetails(gameIds);

  const isLoading = universesLoading && !gameIds.length;

  return (
    <List isLoading={isLoading} navigationTitle="Search Favourite Games" searchBarPlaceholder="Search" isShowingDetail>
      {gameIds.map((gameId) => {
        const gameData = gameDetails?.[gameId];
        if (!gameData) {
          return null;
        }

        let creatorText: string | null = null;
        if (gameData.creator.type == "Group") {
          creatorText = gameData.creator.name + " (Group)";
        } else if (gameData.creator.type == "User") {
          creatorText = gameData.creator.name + " (User)";
        }

        const game: GameData = {
          universeId: gameData.id,
          name: gameData.name,
          rootPlaceId: gameData.rootPlaceId,
          creatorName: creatorText,
          playerCount: gameData.playing,
          totalUpVotes: null,
          totalDownVotes: null,
        };

        return (
          <GamesListItem
            key={game.universeId}
            game={game}
            options={{
              onFavouritePage: true,
              revalidateList: revalidate,
            }}
          />
        );
      })}
    </List>
  );
};
