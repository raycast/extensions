import { List } from "@raycast/api";
import { NoApiKey } from "../errors";
import { useMyGames } from "../lib/fetcher";
import { useIsLoggedIn } from "../lib/hooks";
import { GameDataSimple } from "../types";
import { MyGamesListType } from "./ListItems";

type SearchType = {
  sortBy?: "name" | "playtime_forever";
  order?: "asc" | "desc";
  extraFilter?: (g: GameDataSimple) => boolean;
};
export const MyGames = ({ sortBy = "name", order = "asc", extraFilter = () => true }: SearchType) => {
  const { data: myGames, isLoading } = useMyGames();
  const direction = order === "asc" ? 1 : -1;
  const isLoggedIn = useIsLoggedIn();

  if (!isLoggedIn) return <NoApiKey />;
  return (
    <List navigationTitle="My Steam Account" isLoading={isLoading} searchBarPlaceholder="Search your games...">
      {myGames
        ?.filter((g) => g?.name)
        ?.sort((a, b) => (a?.[sortBy] > b?.[sortBy] ? direction : -direction))
        ?.filter(extraFilter)
        ?.map((game) => (
          <MyGamesListType key={game.appid} game={game} />
        ))}
    </List>
  );
};
