import {
  cleanSteamGameQuery,
  getSteamAppIdFromInput,
  getSteamGameStoreUrl,
  localListWarning,
  searchSteamGames,
} from "../lib/games";
import {
  changeVsLastWeek,
  DAY,
  getCurrentPlayers,
  getPlayerHistory,
  recentStats,
  steamChartsUrl,
} from "../lib/players";

type Input = {
  /**
   * Steam app ID of the game. Use this when you already have the app ID, for example from another Steam tool.
   */
  appid?: number;
  /**
   * Game title to look up when no app ID is known. Examples: "Counter-Strike 2", "Balatro".
   */
  query?: string;
};

const round = (value?: number) => (value === undefined ? undefined : Math.round(value * 10) / 10);

/**
 * Get how many people are playing a Steam game right now, its 24-hour and all-time peaks,
 * and its player trend over the last week and month.
 * Use this when the user asks how many people play a game, how popular it is, or whether its player count is rising or falling.
 */
export default async function getPlayerCount(input: Input) {
  const query = cleanSteamGameQuery(input.query ?? "");
  let game: { appid: number; name?: string } | undefined;
  const appid = input.appid ?? (query ? getSteamAppIdFromInput(query) : undefined);
  if (appid) {
    game = { appid };
  } else if (query) {
    [game] = await searchSteamGames(query, { maxResults: 1 });
  }
  const listWarning = !appid && query ? localListWarning() : undefined;
  if (!game) {
    return {
      warnings: [query ? `No Steam game matched "${query}".` : "Name the game or give its app ID.", listWarning].filter(
        (warning): warning is string => Boolean(warning),
      ),
    };
  }

  const [playingNow, history] = await Promise.all([getCurrentPlayers(game.appid), getPlayerHistory(game.appid)]);
  const points = history?.points ?? [];
  const newest = points.at(-1)?.[0];
  const stale = newest !== undefined && Date.now() - newest > DAY;
  return {
    game: { ...game, storeUrl: getSteamGameStoreUrl(game.appid), steamChartsUrl: steamChartsUrl(game.appid) },
    playingNow,
    peak24h: history?.peak24h,
    allTimePeak: history?.allTimePeak,
    last7Days: recentStats(points, 7),
    last30Days: recentStats(points, 30),
    changeVs7DaysAgoPct: round(changeVsLastWeek(points, playingNow)),
    months: history?.months.slice(0, 6),
    warnings: [
      playingNow === undefined ? "Steam has no live player count for this game." : undefined,
      history ? undefined : "SteamCharts has no player history for this game.",
      stale
        ? `SteamCharts has no player history since ${new Date(newest).toDateString()}, so the 7- and 30-day figures are missing or partial.`
        : undefined,
      listWarning,
    ].filter((warning): warning is string => Boolean(warning)),
  };
}
