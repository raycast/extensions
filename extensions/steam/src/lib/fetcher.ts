import { captureException, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { fakeGameData, fakeGameDataSimpleMany, fakeGames, isFakeData } from "./fake";
import { GameDataSimple, GameDataSimpleResponse, SteamGameHit } from "../types";
import { fetchSteamGames, getSteamGameSearchUrl, searchSteamGameHits } from "./games";
import { steamFetch } from "./http";
import { resolveOwnSteamId } from "./users";
import { CachedDetails, cachedDetails, fetchBatchDetails, fetchFullDetails, isFresh, needsDetails } from "./details";
import {
  AppKind,
  LibraryEntry,
  isIndexReady,
  libraryFirstSeen,
  hiddenAppids,
  recordLibrary,
  shownKinds,
  isIndexStale,
  refreshDays,
  onSyncProgress,
  randomFromIndex,
  searchIndex,
} from "./search-index";
import { markKeyAccepted, markKeyRejected } from "./hooks";
import { libraryOwner } from "./library";
import { downloadGameList, isRejectedKeyFailure } from "./game-list";

async function fetcherWithAuth(url: string) {
  const { token, steamid } = getPreferenceValues<Preferences>();
  if (!token || !steamid) return [];
  const id = await resolveOwnSteamId(steamid, token.trim());
  const response = await steamFetch(url + `&key=${token.trim()}&steamid=${id}`);
  if (response.status === 403) {
    // If the request fails to auth, stash it to check if they later updated it
    await LocalStorage.setItem("API_KEY_ERROR", token.trim() + steamid.trim());
    await markKeyRejected(token.trim());
  }
  // Throwing keeps the cached library on screen; returning an empty list would replace it
  if (!response.ok) throw new Error(`Steam could not load your games (${response.status}).`);
  await LocalStorage.removeItem("API_KEY_ERROR");
  await markKeyAccepted(token.trim());
  const gamesResponse = (await response.json()) as GameDataSimpleResponse;
  const games = gamesResponse?.response?.games ?? [];
  // Steam sometimes answers with an empty response, and private game details look the same
  if (!games.length) throw new Error("Steam returned no games.");
  return games;
}

// Callers render their own not-found and error states, so the hook's failure toast would double them
const silent = () => undefined;

const fakeSearch = async () => fakeGames(30) as SteamGameHit[];

const safely = <T>(read: () => T, fallback: T) => {
  try {
    return read();
  } catch (error) {
    captureException(error);
    return fallback;
  }
};

export const useLocalList = () => {
  const { token, indexRefresh } = getPreferenceValues<Preferences>();
  const key = token?.trim();
  const hasKey = Boolean(key) && !isFakeData;
  const [ready, setReady] = useState(() => hasKey && safely(isIndexReady, false));
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => onSyncProgress(setProgress), []);

  useEffect(() => {
    if (!key || isFakeData || !safely(() => isIndexStale(refreshDays()), false)) return;
    setError(undefined);
    downloadGameList(key)
      .then(() => setReady(true))
      .catch((failure: unknown) => {
        if (isRejectedKeyFailure(failure)) return;
        setError(failure instanceof Error ? failure : new Error(String(failure)));
      });
  }, [key, indexRefresh, attempt]);

  return { hasKey, ready, error, progress, retry: () => setAttempt((count) => count + 1) };
};

// With a key, search never leaves the machine
export const useGamesSearch = ({ term = "", execute = true }) => {
  const list = useLocalList();
  const { hasKey, ready } = list;
  const active = execute && term.trim().length > 0;
  const local = useMemo(
    () => (active && hasKey && ready ? safely(() => searchIndex(term), []) : undefined),
    [active, hasKey, ready, term],
  );
  const remote = useCachedPromise(isFakeData ? fakeSearch : searchSteamGameHits, [term], {
    execute: active && !hasKey,
    keepPreviousData: true,
  });
  const listStatus = hasKey && !ready ? list : undefined;
  if (hasKey) return { data: local, isLoading: false, isError: undefined, listStatus };
  return { data: active ? remote.data : undefined, isLoading: remote.isLoading, isError: remote.error, listStatus };
};

export const useRandomGames = () => {
  const list = useLocalList();
  const { hasKey, ready } = list;
  const [cacheKey] = useState(() => Math.floor(Math.random() * 10000) + 1);
  const { data, isLoading } = usePromise(
    async (seed: number, localReady: boolean) => {
      if (isFakeData) return fakeSearch();
      if (hasKey) return localReady ? randomFromIndex(30) : [];
      return fetchSteamGames(getSteamGameSearchUrl("", seed));
    },
    [cacheKey, ready],
  );
  return { data, isLoading, listStatus: hasKey && !ready ? list : undefined };
};

export const useGameData = ({ appid = 0, execute = true }) => {
  const entry = appid > 0 && !isFakeData ? cachedDetails(appid) : undefined;
  const needsFetch = execute && appid > 0 && !(entry?.full && isFresh(entry));
  const { data, isLoading, error } = usePromise(
    isFakeData ? async () => ({ data: fakeGameData(30), full: true, fetchedAt: Date.now() }) : fetchFullDetails,
    [appid],
    { execute: needsFetch, onError: silent },
  );
  const details: CachedDetails | undefined = data ?? entry;
  return {
    data: details?.data,
    icon: details?.icon,
    isLoading: needsFetch && isLoading && !details,
    isError: details ? undefined : error,
  };
};

const KIND_OF_TYPE: Record<string, AppKind> = {
  game: "game",
  demo: "game",
  mod: "game",
  software: "software",
  tool: "software",
  dlc: "dlc",
  music: "dlc",
  video: "video",
  hardware: "hardware",
};

// Holds rows with no details back until they arrive, so they appear complete instead of filling in.
// Rows with older details show at once and refresh behind the scenes.
export const useResultsWithDetails = <T extends { appid?: number }>(games?: T[]) => {
  const pending = (games ?? [])
    .map((game) => game.appid)
    .filter((appid): appid is number => Boolean(appid) && needsDetails(appid!));
  const waiting = pending.some((appid) => !cachedDetails(appid));
  const key = pending.join(",");
  const { isLoading } = usePromise(async (list: string) => fetchBatchDetails(list.split(",").map(Number)), [key], {
    execute: Boolean(key) && !isFakeData,
    onError: silent,
  });
  const ready = !waiting || isFakeData || !isLoading;
  const kinds = shownKinds();
  const shown = useRef(games);
  if (ready) {
    shown.current = games?.filter((game) => {
      const type = game.appid ? cachedDetails(game.appid)?.data.type : undefined;
      return !type || kinds.includes(KIND_OF_TYPE[type] ?? "game");
    });
  }
  return { games: shown.current, loading: !ready };
};

export const useBatchDetails = (appids: (number | undefined)[]) => {
  const ids = appids.filter((appid): appid is number => Boolean(appid)).join(",");
  usePromise(async (list: string) => fetchBatchDetails(list.split(",").map(Number)), [ids], {
    execute: Boolean(ids) && !isFakeData,
    onError: silent,
  });
};

export const useMyGames = () => {
  const { data, isLoading, error } = useCachedPromise(
    isFakeData ? async () => fakeGameDataSimpleMany(30) : fetcherWithAuth,
    // Same request as the AI tools, which record the library too, so free games don't come and go
    [
      "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?format=json&include_appinfo=1&include_played_free_games=1",
    ],
    {
      onError: silent,
      onData: (games) => {
        if (!isFakeData && games.length && libraryOwner()) {
          safely(
            () =>
              recordLibrary(
                libraryOwner(),
                games.map((game) => game.appid),
              ),
            undefined,
          );
        }
      },
    },
  );
  // Settings can change while the command stays open, so the shown categories are part of the key
  const shown = shownKinds().join(",");
  const games = useMemo(() => {
    if (!data) return data;
    const hidden = safely(() => hiddenAppids(data.map((game) => game.appid)), new Set<number>());
    return hidden.size ? data.filter((game) => !hidden.has(game.appid)) : data;
  }, [data, shown]);
  // A refresh behind cached games isn't loading; only a first fetch with nothing to show is
  return { data: games as GameDataSimple[] | undefined, isLoading: isLoading && !data, isError: error };
};

export const useLibraryFirstSeen = (games?: GameDataSimple[]) =>
  useMemo(
    () =>
      games?.length && libraryOwner()
        ? safely(() => libraryFirstSeen(libraryOwner()), new Map<number, LibraryEntry>())
        : new Map<number, LibraryEntry>(),
    [games],
  );
