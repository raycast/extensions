import { getSteamGameStoreUrl } from "../lib/games";
import { getRecentlyPlayedGames } from "../lib/library";
import { formatPlaytimeHours } from "../lib/users";

/**
 * List the games the user played on Steam in the last two weeks, with playtime for that period and in total.
 * Use this when the user asks what they have been playing lately or how much they played recently.
 */
export default async function getRecentlyPlayedGamesTool() {
  const { games } = await getRecentlyPlayedGames();
  return {
    games: games.map((game) => ({
      appid: game.appid,
      name: game.name,
      lastTwoWeeks: formatPlaytimeHours(game.playtime_2weeks) ?? "0m",
      total: formatPlaytimeHours(game.playtime_forever) ?? "0m",
      storeUrl: getSteamGameStoreUrl(game.appid),
    })),
    warnings: games.length
      ? []
      : ["No games were played in the last two weeks, or the profile's game details are private."],
  };
}
