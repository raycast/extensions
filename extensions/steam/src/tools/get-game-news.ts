import { cleanSteamGameQuery, getSteamAppIdFromInput, localListWarning, searchSteamGames } from "../lib/games";
import { getGameNews, newsText } from "../lib/news";
import { formatSteamTimestamp } from "../lib/users";

type Input = {
  /**
   * Steam app ID of the game. Use this when you already have the app ID, for example from another Steam tool.
   */
  appid?: number;
  /**
   * Game title to look up when no app ID is known. Examples: "Balatro", "Counter-Strike 2".
   */
  query?: string;
  /**
   * Number of news items to return. Defaults to 5, at most 10.
   */
  count?: number;
  /**
   * Only return the developer's own announcements, leaving out press coverage. Use this for patch notes and updates.
   */
  officialOnly?: boolean;
};

/**
 * Get recent news for one Steam game: developer announcements, patch notes, and press coverage.
 * Use this when the user asks what is new with a game, about recent updates or patches, or for game news.
 */
export default async function getGameNewsTool(input: Input) {
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
      news: [],
      warnings: [query ? `No Steam game matched "${query}".` : "Name the game or give its app ID.", listWarning].filter(
        (warning): warning is string => Boolean(warning),
      ),
    };
  }

  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const items = await getGameNews(game.appid, { count, officialOnly: input.officialOnly });
  return {
    game,
    news: items.map((item) => ({
      title: item.title,
      date: formatSteamTimestamp(item.date),
      source: item.feedlabel,
      url: item.url,
      summary: newsText(item.contents),
    })),
    warnings: [items.length ? undefined : "Steam has no news for this game.", listWarning].filter(
      (warning): warning is string => Boolean(warning),
    ),
  };
}
