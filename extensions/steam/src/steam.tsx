import { AI, Action, ActionPanel, Icon, List, LocalStorage, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { cacheProvider } from "./lib/cache";
import { isFakeData } from "./lib/fake";
import { useGamesSearch, useMyGames, useRecentlyPlayedGames } from "./lib/fetcher";
import { MyGamesListType, DynamicGameListItem } from "./components/ListItems";
import { MyGames } from "./components/MyGames";
import { Search, SearchList } from "./components/Search";
import { DefaultActions } from "./components/Actions";
import { useIsLoggedIn } from "./lib/hooks";
import { GameDataSimple } from "./types";
import { GameRecommendations } from "./components/GameRecommendations";

export default function Command() {
  return (
    <SWRConfig value={{ provider: isFakeData ? undefined : cacheProvider }}>
      <App />
    </SWRConfig>
  );
}

const App = () => {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(0);
  const isLoggedIn = useIsLoggedIn();
  const { data: recentlyPlayed } = useRecentlyPlayedGames();
  const { data: searchedGames } = useGamesSearch({ term: search, execute: search.length > 0 });
  const [recentlyViewed, setRecentlyViewed] = useState<GameDataSimple[]>();
  const { data: myGames } = useMyGames();

  useEffect(() => {
    LocalStorage.getItem("recently-viewed").then((gameDataRaw) => {
      if (!gameDataRaw) return;
      const games = JSON.parse(String(gameDataRaw));
      setRecentlyViewed(games ?? []);
    });
  }, []);

  const loading = () => {
    if (search) {
      return !searchedGames;
    }
    if (isLoggedIn) {
      // If logged in, only show if the data is ready
      return !myGames || !recentlyPlayed;
    }
    // If not logged in, we don't need to wait for data
    return false;
  };

  return (
    <List
      isLoading={loading()}
      onSearchTextChange={setSearch}
      onSelectionChange={(id) => setHovered(Number(id ?? 0))}
      throttle
      searchBarPlaceholder="Search for a game by title..."
    >
      {search ? (
        <SearchList searchedGames={searchedGames} hovered={hovered} />
      ) : (
        <>
          {isLoggedIn ? (
            <List.Item
              title="My Games"
              icon={{ source: "command-icon.png" }}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.List} title="View My Games" target={<MyGames />} />
                  <DefaultActions />
                </ActionPanel>
              }
            />
          ) : null}
          {isLoggedIn ? (
            <List.Item
              title="Search Steam Games"
              icon={{ source: "command-icon.png" }}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Binoculars} title="Search Steam Games" target={<Search />} />
                  <DefaultActions />
                </ActionPanel>
              }
            />
          ) : null}
          {isLoggedIn && environment.canAccess(AI) ? <GameRecommendations recentlyViewed={recentlyViewed} /> : null}
          {recentlyViewed && recentlyViewed?.length > 0 ? (
            <List.Section title="Recently Viewed Games">
              {recentlyViewed?.map((game) => (
                <DynamicGameListItem
                  context="recently-viewed"
                  key={game.appid}
                  game={game}
                  ready={true}
                  myGames={myGames}
                />
              ))}
            </List.Section>
          ) : null}
          {recentlyPlayed && recentlyPlayed?.length > 0 ? (
            <List.Section title="Recently Played Games">
              {recentlyPlayed?.slice(0, 5)?.map((game) => (
                <MyGamesListType key={game.appid} game={game} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
};
