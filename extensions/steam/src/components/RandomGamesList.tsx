import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useGamesSearch, useMyGames } from "../lib/fetcher";
import { DynamicGameListItem } from "./ListItems";

export const RandomGamesList = () => {
  const [cacheKey, setCacheKey] = useState(0);
  const { data: games, isLoading } = useGamesSearch({ cacheKey, execute: cacheKey > 0 });
  const [hovered, setHovered] = useState(0);
  const { data: myGames } = useMyGames();

  useEffect(() => {
    if (cacheKey) return;
    setCacheKey(Math.floor(Math.random() * 10000));
  }, [cacheKey]);

  return (
    <List
      navigationTitle="Random Games"
      enableFiltering={false}
      isLoading={isLoading}
      searchBarPlaceholder=""
      onSelectionChange={(id) => setHovered(Number(id ?? 0))}
    >
      {games?.map((game) => (
        <DynamicGameListItem
          context="random"
          key={game.appid}
          game={game}
          ready={hovered === game.appid}
          myGames={myGames}
        />
      ))}
    </List>
  );
};
