import { cachedDetails, fetchBatchDetails, storeFacts } from "../lib/details";
import { getSteamGameStoreUrl } from "../lib/games";
import { ownedAppids } from "../lib/library";
import { resolveGames, tagMatch, tagNames, tasteProfile } from "../lib/recommend";
import { getSimilarGames } from "../lib/similar";

type Input = {
  /**
   * Games the user likes, separated by semicolons, at most 10. Use app IDs when known, for example from another Steam tool, otherwise titles. Examples: "Hades; Hollow Knight", "1145360; 367520".
   */
  games: string;
  /**
   * Number of games to return. Defaults to 20, at most 50.
   */
  count?: number;
};

/**
 * Recommend Steam games the user doesn't own, based on games they like.
 * Pools Steam's "More like this" lists for every given game and leaves out owned games. Games that Steam counts among the closest matches for more of the given games come first, then by how closely their Steam tags match.
 * Use this when the user asks what to buy or try next, or for games like several games at once. For games from their own library, use Recommend Owned Games.
 * `similarTo` lists which of the given games Steam lists it beside.
 */
export default async function recommendGamesTool(input: Input) {
  const { games: liked, unmatched, listWarning } = await resolveGames(input.games ?? "");
  const warnings = [
    ...unmatched.map((query) => `No Steam game matched "${query}".`),
    ...(listWarning ? [listWarning] : []),
  ];
  if (!liked.length) return { games: [], warnings: warnings.length ? warnings : ["Name at least one game."] };

  const likedIds = new Set(liked.map((game) => game.appid));
  const listedBy = new Map<number, { sources: number[]; closest: number }>();
  const lists = await Promise.all(liked.map((game) => getSimilarGames(game.appid)));
  for (const [index, sections] of lists.entries()) {
    for (const [position, section] of sections.entries()) {
      for (const appid of section.appids) {
        if (likedIds.has(appid)) continue;
        const entry = listedBy.get(appid);
        listedBy.set(appid, {
          sources: [...(entry?.sources ?? []), liked[index].appid],
          // Later groups (upcoming, free, top sellers) repeat across unrelated games, so only the first one counts
          closest: (entry?.closest ?? 0) + (position === 0 ? 1 : 0),
        });
      }
    }
  }

  await fetchBatchDetails([...likedIds, ...listedBy.keys()]);
  const [owned, names] = await Promise.all([ownedAppids(), tagNames()]);
  if (!owned) warnings.push("Your Steam library couldn't be read, so games you own may be included.");
  const profile = tasteProfile([...likedIds]);
  const nameOf = (appid: number) => liked.find((game) => game.appid === appid)?.name ?? cachedDetails(appid)?.data.name;
  const count = Math.min(Math.max(input.count ?? 20, 1), 50);

  const games = [...listedBy]
    .flatMap(([appid, { sources, closest }]) => {
      const data = cachedDetails(appid)?.data;
      if (!data?.name || data.type === "demo" || owned?.has(appid)) return [];
      const { similarity, sharedTags } = tagMatch(profile, appid, names);
      const facts = storeFacts(appid);
      const game = {
        appid,
        name: data.name,
        similarity,
        sharedTags,
        similarTo: sources.flatMap((source) => nameOf(source) ?? []),
        releaseDate: data.release_date?.date || undefined,
        comingSoon: data.release_date?.coming_soon,
        developers: data.developers,
        shortDescription: data.short_description,
        price: facts.price,
        discountPercent: facts.discountPercent,
        reviews: facts.reviews,
        storeUrl: getSteamGameStoreUrl(appid),
      };
      return [{ closest, game }];
    })
    .sort((a, b) => b.closest - a.closest || b.game.similarity - a.game.similarity)
    .slice(0, count)
    .map(({ game }) => game);

  return {
    basedOn: liked.map((game) => ({ appid: game.appid, name: nameOf(game.appid) })),
    games,
    warnings: [...warnings, ...(games.length ? [] : ["Steam lists no similar games for these games."])],
  };
}
