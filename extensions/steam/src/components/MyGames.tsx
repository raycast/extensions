import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AccountNotice } from "../errors";
import { useLibraryFirstSeen, useMyGames, useOwnership, useResultsWithDetails } from "../lib/fetcher";
import { useIsLoggedIn, usePinnedGames } from "../lib/hooks";
import { GameDataSimple } from "../types";
import { MyGamesListType } from "./ListItems";
import { PinActions } from "./PinActions";
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

export const MyGames = ({ initialSort, navigationTitle }: { initialSort?: LibrarySort; navigationTitle?: string }) => {
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
  const [pinned, setPinned] = usePinnedGames();

  // Pins of games no longer in the library stay stored, so they come back pinned
  const pinnedGames = useMemo(() => {
    const byId = new Map((myGames ?? []).filter((game) => game?.name).map((game) => [game.appid, game]));
    return pinned.flatMap((appid) => byId.get(appid) ?? []);
  }, [myGames, pinned]);

  const games = useMemo(() => {
    const all = (myGames ?? []).filter((game) => game?.name && !pinned.includes(game.appid));
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
  }, [myGames, firstSeen, sort, pinned]);

  // Picked again only when the sort changes or the games first arrive, so reordering pins keeps the selection
  const hasGames = pinnedGames.length + games.length > 0;
  const topId = useMemo(() => {
    if (pinnedGames[0]) return `pinned:${sort}:${pinnedGames[0].appid}`;
    return games[0] ? `${sort}:${games[0].appid}` : undefined;
  }, [sort, hasGames]);

  const shownPins = pinnedGames.map((game) => game.appid);

  const sortTitle = SORTS.find((option) => option.value === sort)?.title;

  const detailFor = (game: GameDataSimple) => {
    if (sort === "last-played") return playedText(game.rtime_last_played);
    if (sort === "added") return addedText(firstSeen.get(game.appid)?.firstSeen);
    return undefined;
  };

  if (!isLoggedIn) return <AccountNotice />;
  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Search your games..."
      // Ids carry the sort, so switching views drops the old selection and starts at the top
      selectedItemId={topId}
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
      {pinnedGames.length > 0 && (
        <List.Section title="Pinned">
          {pinnedGames.map((game) => (
            <MyGamesListType
              key={game.appid}
              id={`pinned:${sort}:${game.appid}`}
              game={game}
              detail={detailFor(game)}
              owned={ownership.get(game.appid)}
              pinActions={<PinActions appid={game.appid} pinned={pinned} shown={shownPins} setPinned={setPinned} />}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={pinnedGames.length > 0 ? sortTitle : undefined}>
        {games.map((game) => (
          <MyGamesListType
            key={game.appid}
            id={`${sort}:${game.appid}`}
            game={game}
            detail={detailFor(game)}
            owned={ownership.get(game.appid)}
            pinActions={<PinActions appid={game.appid} pinned={pinned} shown={shownPins} setPinned={setPinned} />}
          />
        ))}
      </List.Section>
    </List>
  );
};
