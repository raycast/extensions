import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export type Favorites = {
  teams: { id: number; name: string; leagueName?: string }[];
  leagues: { id: number; name: string; ccode?: string }[];
};

const KEY = "favorites";
const EMPTY: Favorites = { teams: [], leagues: [] };

/** Run a favorite toggle, then confirm it with a toast. */
export async function toggleFavorite(
  wasFavorite: boolean,
  name: string,
  run: () => Promise<void>,
): Promise<void> {
  await run();
  await showToast({
    style: Toast.Style.Success,
    title: wasFavorite ? "Removed from Favorites" : "Added to Favorites",
    message: name,
  });
}

// useLocalStorage caches its value in React state, so a toggle built from
// that state can lose a change another open command window just wrote —
// each window's cache goes stale the moment the other one writes.
// useLocalStorage stores plain JSON.stringify(value) under this same key
// (Favorites has no Date/Buffer fields, so no reviver is needed), so reading
// it directly gets the true current value right before writing, not a
// snapshot. Not a real compare-and-swap — Raycast's LocalStorage has no
// locking primitive — but it removes the stale-cache window that made two
// overlapping writes a coin flip.
async function currentFavorites(): Promise<Favorites> {
  const raw = await LocalStorage.getItem<string>(KEY);
  return raw ? (JSON.parse(raw) as Favorites) : EMPTY;
}

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<Favorites>(KEY, EMPTY);
  const favorites = value ?? EMPTY;

  const update = async (build: (f: Favorites) => Favorites) =>
    setValue(build(await currentFavorites()));

  return {
    favorites,
    isLoading,
    isTeam: (id: number) => favorites.teams.some((t) => t.id === id),
    isLeague: (id: number) => favorites.leagues.some((l) => l.id === id),
    toggleTeam: (team: Favorites["teams"][number]) =>
      update((f) => ({
        ...f,
        teams: f.teams.some((t) => t.id === team.id)
          ? f.teams.filter((t) => t.id !== team.id)
          : [...f.teams, team],
      })),
    toggleLeague: (league: Favorites["leagues"][number]) =>
      update((f) => ({
        ...f,
        leagues: f.leagues.some((l) => l.id === league.id)
          ? f.leagues.filter((l) => l.id !== league.id)
          : [...f.leagues, league],
      })),
  };
}
