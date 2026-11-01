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
// snapshot.
async function currentFavorites(): Promise<Favorites> {
  const raw = await LocalStorage.getItem<string>(KEY);
  return raw ? (JSON.parse(raw) as Favorites) : EMPTY;
}

// Two overlapping toggles would both read the same value and the later write
// would drop the earlier change, so every read-modify-write waits its turn.
// setValue resolves only after setItem lands, so each read sees the last write.
let queue: Promise<unknown> = Promise.resolve();

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<Favorites>(KEY, EMPTY);
  const favorites = value ?? EMPTY;

  const update = (build: (f: Favorites) => Favorites) => {
    const run = queue.then(async () =>
      setValue(build(await currentFavorites())),
    );
    queue = run.catch(() => {});
    return run;
  };

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
