import { List } from "@raycast/api";
import { NoApiKey } from "../errors";
import { useRecentlyPlayedGames } from "../lib/fetcher";
import { useIsLoggedIn } from "../lib/hooks";
import { MyGamesListType } from "./ListItems";

export const RecentlyPlayedGames = () => {
  const { data: recentGames, isLoading } = useRecentlyPlayedGames();
  const isLoggedIn = useIsLoggedIn();

  if (!isLoggedIn) return <NoApiKey />;
  return (
    <List navigationTitle="Recently Played Games" isLoading={isLoading}>
      {recentGames?.map((game) => (
        <MyGamesListType key={game.appid} game={game} />
      ))}
    </List>
  );
};
