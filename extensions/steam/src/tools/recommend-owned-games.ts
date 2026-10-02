import { cachedDetails, detailsWarning, fetchBatchDetails, storeFacts } from "../lib/details";
import { getSteamGameStoreUrl } from "../lib/games";
import { getOwnedGames } from "../lib/library";
import { resolveGames, tagMatch, tagNames, tasteProfile } from "../lib/recommend";
import { formatPlaytimeHours, formatSteamTimestamp } from "../lib/users";

type Input = {
  /**
   * Games the user likes, separated by semicolons, at most 10. They don't need to be owned. Use app IDs when known, for example from another Steam tool, otherwise titles. Examples: "Hades; Hollow Knight", "1145360; 367520".
   */
  games: string;
  /**
   * Number of games to return. Defaults to 20, at most 50.
   */
  count?: number;
  /**
   * Only return games the user has never played. Use this for backlog questions.
   */
  unplayedOnly?: boolean;
};

/**
 * Find games in the user's own Steam library that are like games they name, ranked by how closely their Steam tags match.
 * Use this when the user asks what to play next from games they own, or which of their games are like another game. Needs your Web API Key and Steam ID.
 */
export default async function recommendOwnedGamesTool(input: Input) {
  const { games: liked, unmatched, listWarning } = await resolveGames(input.games ?? "");
  const warnings = [
    ...unmatched.map((query) => `No Steam game matched "${query}".`),
    ...(listWarning ? [listWarning] : []),
  ];
  if (!liked.length) return { games: [], warnings: warnings.length ? warnings : ["Name at least one game."] };

  const { games: library } = await getOwnedGames();
  const likedIds = new Set(liked.map((game) => game.appid));
  const failure = detailsWarning(await fetchBatchDetails([...likedIds, ...library.map((game) => game.appid)]));
  if (failure) warnings.push(failure);
  const names = await tagNames();
  const profile = tasteProfile([...likedIds]);
  const count = Math.min(Math.max(input.count ?? 20, 1), 50);

  const games = library
    .filter((game) => !likedIds.has(game.appid) && (!input.unplayedOnly || !game.playtime_forever))
    .map((game) => ({ game, match: tagMatch(profile, game.appid, names) }))
    .filter(({ match }) => match.similarity > 0)
    .sort((a, b) => b.match.similarity - a.match.similarity)
    .slice(0, count)
    .map(({ game, match }) => ({
      appid: game.appid,
      name: game.name,
      similarity: match.similarity,
      sharedTags: match.sharedTags,
      playtime: formatPlaytimeHours(game.playtime_forever) ?? "never played",
      lastPlayed: formatSteamTimestamp(game.rtime_last_played),
      shortDescription: cachedDetails(game.appid)?.data.short_description,
      reviews: storeFacts(game.appid).reviews,
      storeUrl: getSteamGameStoreUrl(game.appid),
    }));

  return {
    basedOn: liked.map((game) => ({ appid: game.appid, name: game.name ?? cachedDetails(game.appid)?.data.name })),
    games,
    warnings: [
      ...warnings,
      ...(library.length ? [] : ["Steam returned no games. The profile's game details may be private."]),
      ...(library.length && !games.length ? ["None of your games share tags with these games."] : []),
    ],
  };
}
