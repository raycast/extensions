import fetch from "node-fetch";
import useSWR, { useSWRConfig } from "swr";
import { fakeGameData, fakeGameDataSimpleMany, fakeGames, isFakeData } from "./fake";
import { GameData, GameDataResponse, GameDataSimple, GameDataSimpleResponse, GameSimple } from "../types";
import { getPreferenceValues, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { useIsLoggedIn } from "./hooks";
import { reverse } from "./util";

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
  // TODO: Check rare limiting error
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
  const response = await fetch(url + `&key=${token.trim()}&steamid=${steamid.trim()}`);
  if (response.status === 403) {
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
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const gamesResponse = (await response.json()) as GameDataSimpleResponse;
  return gamesResponse?.response?.games ?? [];
}

export const useGamesSearch = ({ term = "", cacheKey = 0, ready = true }) => {
  const { data, error, isValidating } = useSWR<GameSimple[]>(
    ready ? `https://steam-search.vercel.app/api/games?cacheKey=${cacheKey}&search=${term}` : null,
    isFakeData ? () => fakeGames(30) : fetchGames
  );
  return {
    data,
    isLoading: !data && !error && ready,
    isValidating,
    isError: error,
  };
};

export const useGameData = ({ appid = 0, ready = true }) => {
  const { cache } = useSWRConfig();
  const key = {
    appid,
    url: `https://store.steampowered.com/api/appdetails?appids=${appid}`,
  };
  const { data, error, isValidating } = useSWR<GameData | undefined>(
    ready && appid ? key : null,
    isFakeData ? () => fakeGameData(30) : fetchGameData
  );

  // Slightly hacky way to grab something from swr cache
  const cacheKey = `#url:"${key.url}",appid:${appid},`;
  if (!data && cache.get(cacheKey) && !error) {
    return { data: cache.get(cacheKey) };
  }

  return {
    data,
    isLoading: !data && !error,
    isValidating,
    isError: error,
  };
};

export const useRecentlyPlayedGames = () => useGetOwnedGames("GetRecentlyPlayedGames");
export const useMyGames = () => useGetOwnedGames("GetOwnedGames");
const useGetOwnedGames = (type: string) => {
  const isLoggedIn = useIsLoggedIn();
  const { data, error, isValidating } = useSWR<GameDataSimple[]>(
    isLoggedIn ? `https://api.steampowered.com/IPlayerService/${type}/v1/?format=json&include_appinfo=1` : null,
    isFakeData ? () => fakeGameDataSimpleMany(30) : fetcherWithAuth
  );

  return {
    data: data ? reverse(data) : undefined,
    isLoading: !data && !error,
    isValidating,
    isError: error,
  };
};
