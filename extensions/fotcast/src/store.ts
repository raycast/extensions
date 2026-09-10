import { useLocalStorage } from "@raycast/utils";

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

  return {
    favorites,
    isLoading,
    isTeam: (id: number) => favorites.teams.some((t) => t.id === id),
    isLeague: (id: number) => favorites.leagues.some((l) => l.id === id),
    toggleTeam: (team: Favorites["teams"][number]) =>
      setValue({
        ...favorites,
        teams: favorites.teams.some((t) => t.id === team.id)
          ? favorites.teams.filter((t) => t.id !== team.id)
          : [...favorites.teams, team],
      }),
    toggleLeague: (league: Favorites["leagues"][number]) =>
      setValue({
        ...favorites,
        leagues: favorites.leagues.some((l) => l.id === league.id)
          ? favorites.leagues.filter((l) => l.id !== league.id)
          : [...favorites.leagues, league],
      }),
  };
}
