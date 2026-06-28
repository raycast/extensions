import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { getRobloxCookie } from "./auth";
import { requestIconForGames } from "./icons";
import { Game, SortResponse } from "./types";

let sortToken: Promise<string> | undefined;

async function _fetchSortToken(cookie: string): Promise<string> {
  const f = await fetch("https://games.roblox.com/v1/games/sorts?gameSortsContext=HomeSorts", {
    headers: {
      cookie: " .ROBLOSECURITY=" + cookie + ";",
      "User-Agent": "Roblox/WinInet",
    },
  });
  if (f.status != 200) throw new Error("Failed to get sort token");
  const json = (await f.json()) as SortResponse;
  const foundSort = json.sorts.find((s: { name: string }) => s.name == getPreferenceValues().defaultsort);
  if (!foundSort)
    throw new Error(
      "Couldn't find sort for user's preferred sort. This is probably a change on Roblox's end that we haven't updated for."
    );
  return foundSort.token;
}

function getSortToken(cookie: string): Promise<string> {
  if (sortToken)
    return sortToken.catch(() => {
      sortToken = undefined;
      return getSortToken(cookie);
    });
  return (sortToken = _fetchSortToken(cookie));
}

export default async function performSearch(searchText: string, signal: AbortSignal): Promise<Game[]> {
  const cookie = await getRobloxCookie();
  const st = await getSortToken(cookie);
  const url =
    "https://games.roblox.com/v1/games/list?" +
    (searchText ? "keyword=" + encodeURIComponent(searchText) : "sortToken=" + st);
  const response = await fetch(url, {
    headers: {
      Cookie: ".ROBLOSECURITY=" + cookie + ";",
      "User-Agent": "Roblox/WinInet",
    },
    signal,
  });

  const json = (await response.json()) as { errors?: { message: string }[]; games?: Game[] };
  if (json.errors) throw new Error(json.errors[0].message);
  const games = json.games as Game[];
  await requestIconForGames(games);
  return games;
}
