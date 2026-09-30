import got from "got";
import sortKeys from "sort-keys";
import { DbInfo, SteamGame } from "./types.js";

export const searchSteamGames = (keyword: string) => {
  const url = new URL("https://steam-search.vercel.app/api/games");
  url.searchParams.set("search", keyword);
  return got(url).json<SteamGame[]>();
};

export const getProtonDbInfo = async (steamAppId: number) => {
  const info = await got(
    `https://www.protondb.com/api/v1/reports/summaries/${steamAppId}.json`,
  ).json<DbInfo>();
  const sortedInfo = sortKeys(info, {
    compare: (a, b) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      if (x.endsWith("tier") && !y.endsWith("tier")) return -1;
      if (!x.endsWith("tier") && y.endsWith("tier")) return 1;
      return x.localeCompare(y);
    },
  });
  return sortedInfo;
};
