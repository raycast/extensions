import { cachedDetails, fetchBatchDetails, storeFacts } from "../lib/details";
import {
  cleanSteamGameQuery,
  getSteamAppIdFromInput,
  getSteamGameStoreUrl,
  localListWarning,
  searchSteamGames,
} from "../lib/games";
import { ownedAppids } from "../lib/library";
import { getSimilarGames } from "../lib/similar";

type Input = {
  /**
   * Steam app ID of the game to find similar games for. Use this when you already have the app ID, for example from another Steam tool.
   */
  appid?: number;
  /**
   * Game title to look up when no app ID is known. Examples: "Hades", "Stardew Valley".
   */
  query?: string;
  /**
   * Number of games to return. Defaults to 20, at most 60.
   */
  count?: number;
};

/**
 * Find games similar to one Steam game, from Steam's own "More like this" list.
 * Use this when the user asks for games like one they name, or for recommendations based on a game they liked.
 * Each game has the group Steam lists it under, such as Similar Games, Upcoming Releases, Free Games, New Releases, or Top Sellers.
 * `owned` is only set when the user's library could be read.
 */
export default async function findSimilarGamesTool(input: Input) {
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
      games: [],
      warnings: [query ? `No Steam game matched "${query}".` : "Name the game or give its app ID.", listWarning].filter(
        (warning): warning is string => Boolean(warning),
      ),
    };
  }

  const sections = await getSimilarGames(game.appid);
  await fetchBatchDetails(sections.flatMap((section) => section.appids));
  const owned = await ownedAppids();
  const count = Math.min(Math.max(input.count ?? 20, 1), 60);
  const games = sections
    .flatMap((section) =>
      section.appids.flatMap((id) => {
        const data = cachedDetails(id)?.data;
        if (!data?.name || data.type === "demo") return [];
        const facts = storeFacts(id);
        return [
          {
            appid: id,
            name: data.name,
            group: section.title,
            type: data.type,
            releaseDate: data.release_date?.date || undefined,
            comingSoon: data.release_date?.coming_soon,
            developers: data.developers,
            shortDescription: data.short_description,
            price: facts.price,
            discountPercent: facts.discountPercent,
            reviews: facts.reviews,
            storeUrl: getSteamGameStoreUrl(id),
            owned: owned?.has(id),
          },
        ];
      }),
    )
    .slice(0, count);

  return {
    game,
    games,
    warnings: [games.length ? undefined : "Steam lists no similar games for this game.", listWarning].filter(
      (warning): warning is string => Boolean(warning),
    ),
  };
}
