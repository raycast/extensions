import { List } from "@raycast/api";
import { useState } from "react";
import { useGamesSearch, useMyGames } from "../lib/fetcher";
import { DynamicGameListItem } from "./ListItems";
import { GameSimple } from "../types";

export const Search = () => {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(0);
  const { data: searchedGames } = useGamesSearch({ term: search, execute: search.length > 0 });
  return (
    <List
      isLoading={Boolean(search && !searchedGames?.length)}
      onSearchTextChange={setSearch}
      onSelectionChange={(id) => setHovered(Number(id ?? 0))}
      throttle
      searchBarPlaceholder="Search for a game by title..."
    >
      <SearchList searchedGames={searchedGames} hovered={hovered} />
    </List>
  );
};

export const SearchList = ({ searchedGames, hovered }: { searchedGames?: GameSimple[]; hovered: number }) => {
  const { data: myGames } = useMyGames();
  return (
    <List.Section title="Search Results">
      {searchedGames?.map((game) => (
        <DynamicGameListItem
          context="Search"
          key={game.appid}
          game={game}
          ready={hovered === game.appid}
          myGames={myGames}
        />
      ))}
    </List.Section>
  );
};
