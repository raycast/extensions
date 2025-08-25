import useSWR, { useSWRConfig } from "swr";
import { fakeGameData, fakeGameDataSimpleMany, fakeGames, isFakeData } from "./fake";
import { GameData, GameDataResponse, GameDataSimple, GameDataSimpleResponse, GameSimple } from "../types";
import { getPreferenceValues, LocalStorage, openCommandPreferences, showToast, Toast } from "@raycast/api";

async function fetchGames(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const games = (await response.json()) as GameSimple[];
  return games?.filter((game) => game?.appid) ?? [];
}

async function fetchGameData({ appid, url }: { appid: number; url: string }) {
  const response = await fetch(url);

  if (!response.ok) {
    throw Object.assign(new Error(`${response.status} ${response.statusText}`), { status: response.status });
  }
  const gameData = (await response.json()) as GameDataResponse;
  if (!gameData?.[appid]?.success) {
    throw Object.assign(new Error("Game not found"), { status: 404 });
  }
  return gameData?.[appid]?.data;
}

async function fetcherWithAuth(url: string) {
  const { token, steamid } = getPreferenceValues();
  if (!token && !steamid) return [];
  const response = await fetch(url + `&key=${token.trim()}&steamid=${steamid.trim()}`);
  if (response.status === 403) {
    // If the request fails to auth, stash it to check if they later updated it
    await LocalStorage.setItem("API_KEY_ERROR", token.trim() + steamid.trim());
    showToast({
      title: "403 Error",
      message: "Please check your API key.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Open preferences",
        onAction: () => {
          openCommandPreferences();
        },
      },
    });
  }
  if (!response.ok) {
    return [];
  }
  await LocalStorage.removeItem("API_KEY_ERROR");
  const gamesResponse = (await response.json()) as GameDataSimpleResponse;
  return gamesResponse?.response?.games ?? [];
}

export const useGamesSearch = ({ term = "", cacheKey = 0, execute = true }) => {
  const { data, error, isValidating } = useSWR<GameSimple[]>(
    execute ? `https://steam-search.vercel.app/api/games?cacheKey=${cacheKey}&search=${term}` : null,
    isFakeData ? () => fakeGames(30) : fetchGames,
  );
  return {
    data,
    isLoading: !data && !error && execute,
    isValidating,
    isError: error,
  };
};

export const useGameData = <T>({ appid = 0, execute = true }) => {
  const { cache } = useSWRConfig();
  const key = {
    appid,
    url: `https://store.steampowered.com/api/appdetails?appids=${appid}`,
  };
  const { data, error, isValidating } = useSWR<GameData | undefined>(
    execute && appid ? key : null,
    isFakeData ? () => fakeGameData(30) : fetchGameData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 600_000, // 10 minutes
      dedupingInterval: 600_000, // 10 minutes
    },
  );

  // Slightly hacky way to grab something from swr cache
  // If swr changes their serialization implimentation, this will break (gracefully)
  const cacheKey = `#url:"${key.url}",appid:${appid},`;
  if (!data && cache.get(cacheKey) && !error) {
    return { data: cache.get(cacheKey) as T };
  }

  return {
    data: data as T,
    isLoading: !data && !error,
    isValidating,
    isError: error,
  };
};

export const useRecentlyPlayedGames = () => useGetOwnedGames("GetRecentlyPlayedGames");
export const useMyGames = () => useGetOwnedGames("GetOwnedGames");
const useGetOwnedGames = (type: string) => {
  const { data, error, isValidating } = useSWR<GameDataSimple[]>(
    `https://api.steampowered.com/IPlayerService/${type}/v1/?format=json&include_appinfo=1`,
    isFakeData ? () => fakeGameDataSimpleMany(30) : fetcherWithAuth,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 600_000, // 10 minutes
      dedupingInterval: 600_000, // 10 minutes
    },
  );

  return {
    data: data,
    isLoading: !data && !error,
    isValidating,
    isError: error,
  };
};
