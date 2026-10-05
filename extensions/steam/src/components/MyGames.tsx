import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { WebApiKeyNotice } from "../errors";
import { useLibraryFirstSeen, useMyGames, useOwnership, useResultsWithDetails } from "../lib/fetcher";
import { useIsLoggedIn } from "../lib/hooks";
import { GameDataSimple } from "../types";
import { MyGamesListType } from "./ListItems";
import { addedText, playedText } from "../lib/util";

export type LibrarySort = "name" | "playtime" | "last-played" | "added" | "never-played";

const SORTS: { value: LibrarySort; title: string; empty: string }[] = [
  { value: "name", title: "Name", empty: "No Games Found" },
  { value: "playtime", title: "Most Played", empty: "No Played Games" },
  { value: "last-played", title: "Last Played", empty: "No Played Games" },
  { value: "added", title: "Recently Added", empty: "No Games Found" },
  { value: "never-played", title: "Never Played", empty: "No Unplayed Games" },
];

const byName = (a: GameDataSimple, b: GameDataSimple) => a.name.localeCompare(b.name);

export const MyGames = ({ initialSort }: { initialSort?: LibrarySort }) => {
  // Read at the first render, where the dropdown's own storeValue arrives later and flashes another order
  const [storedSort, setStoredSort] = useCachedState<LibrarySort>("my-games-sort", "name");
  const [pickedSort, setPickedSort] = useState(initialSort);
  const sort = pickedSort ?? storedSort;
  const { data: owned, isLoading: loadingGames } = useMyGames();
  const { games: myGames, loading: loadingDetails } = useResultsWithDetails(owned);
  const isLoading = loadingGames || loadingDetails;
  const firstSeen = useLibraryFirstSeen(myGames);
  const ownership = useOwnership(myGames);
  const isLoggedIn = useIsLoggedIn();

  const games = useMemo(() => {
    const all = (myGames ?? []).filter((game) => game?.name);
    switch (sort) {
      case "playtime":
        return all.filter((game) => game.playtime_forever > 0).sort((a, b) => b.playtime_forever - a.playtime_forever);
      case "last-played":
        return all
          .filter((game) => game.rtime_last_played)
          .sort((a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0));
      case "added": {
        // Games from the first import were not necessarily just bought, so they follow in name order
        const added = (game: GameDataSimple) => {
          const entry = firstSeen.get(game.appid);
          return entry && !entry.baseline ? entry.firstSeen : 0;
        };
        return all.sort((a, b) => added(b) - added(a) || byName(a, b));
      }
      case "never-played":
        return all.filter((game) => !game.playtime_forever).sort(byName);
      default:
        return all.sort(byName);
    }
  }, [myGames, firstSeen, sort]);

  const detailFor = (game: GameDataSimple) => {
    if (sort === "last-played") return playedText(game.rtime_last_played);
    if (sort === "added") return addedText(firstSeen.get(game.appid)?.firstSeen);
    return undefined;
  };

  if (!isLoggedIn) return <WebApiKeyNotice />;
  return (
    <List
      navigationTitle="My Games"
      isLoading={isLoading}
      searchBarPlaceholder="Search your games..."
      // Ids carry the sort, so switching views drops the old selection and starts at the top
      selectedItemId={games[0] ? `${sort}:${games[0].appid}` : undefined}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          value={sort}
          onChange={(value) => {
            // Only a real change is saved, not the sort a shortcut opened with
            if (value === sort) return;
            if (initialSort) setPickedSort(value as LibrarySort);
            setStoredSort(value as LibrarySort);
          }}
        >
          {SORTS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {/* Without an empty view, Raycast shows its own "No Results" while the list waits for rows */}
      <List.EmptyView
        icon={Icon.GameController}
        title={isLoading ? "Loading Your Games…" : SORTS.find((option) => option.value === sort)?.empty}
      />
      {games.map((game) => (
        <MyGamesListType
          key={game.appid}
          id={`${sort}:${game.appid}`}
          game={game}
          detail={detailFor(game)}
          owned={ownership.get(game.appid)}
        />
      ))}
    </List>
  );
};
