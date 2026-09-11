import { useLocalStorage } from "@raycast/utils";
import { useRef } from "react";

export type Favorites = {
  teams: { id: number; name: string; leagueName?: string }[];
  leagues: { id: number; name: string; ccode?: string }[];
};

const EMPTY: Favorites = { teams: [], leagues: [] };

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<Favorites>(
    "favorites",
    EMPTY,
  );
  const favorites = value ?? EMPTY;

  // useLocalStorage's setValue takes a plain value, not a functional updater,
  // so two toggles fired before a re-render would both build off the same
  // stale `favorites` closure and the second write would clobber the first.
  // A ref tracking the latest known value keeps back-to-back toggles chained.
  const latest = useRef(favorites);
  latest.current = favorites;
  const update = (next: Favorites) => {
    latest.current = next;
    return setValue(next);
  };

  return {
    favorites,
    isLoading,
    isTeam: (id: number) => favorites.teams.some((t) => t.id === id),
    isLeague: (id: number) => favorites.leagues.some((l) => l.id === id),
    toggleTeam: (team: Favorites["teams"][number]) => {
      const f = latest.current;
      return update({
        ...f,
        teams: f.teams.some((t) => t.id === team.id)
          ? f.teams.filter((t) => t.id !== team.id)
          : [...f.teams, team],
      });
    },
    toggleLeague: (league: Favorites["leagues"][number]) => {
      const f = latest.current;
      return update({
        ...f,
        leagues: f.leagues.some((l) => l.id === league.id)
          ? f.leagues.filter((l) => l.id !== league.id)
          : [...f.leagues, league],
      });
    },
  };
}
