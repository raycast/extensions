import { getPreferenceValues } from "@raycast/api";
import { cachedDetails, detailsWarning, fetchBatchDetails, storeFacts } from "../lib/details";
import { getSteamGameStoreUrl, localListWarning } from "../lib/games";
import { isIndexReady, latestApps } from "../lib/search-index";
import { formatSteamTimestamp } from "../lib/users";

type Input = {
  /**
   * "added" lists the apps a refresh of the game list most recently found new on Steam, mostly upcoming games and new store pages; `added` is the date of that refresh. "updated" lists the apps whose Steam store data changed most recently.
   */
  sortBy: "added" | "updated";
  /**
   * Number of apps to return. Defaults to 20, at most 50.
   */
  count?: number;
};

/**
 * List apps from the local Steam game list by when they appeared on Steam or were last updated there.
 * Use this when the user asks what's new on Steam, what was just added, or what changed since the game list was refreshed. Needs your Web API Key.
 */
export default async function queryGameListTool(input: Input) {
  if (!getPreferenceValues<Preferences>().token?.trim()) {
    throw new Error("The game list needs a Web API Key in the Steam extension preferences.");
  }
  if (!isIndexReady()) {
    throw new Error("The Steam game list hasn't downloaded yet. Open Search Games once to download it.");
  }
  const apps = latestApps(input.sortBy, Math.min(Math.max(input.count ?? 20, 1), 50));
  const loaded = await fetchBatchDetails(apps.map((app) => app.appid));

  const games = apps.map((app) => {
    const data = cachedDetails(app.appid)?.data;
    const facts = storeFacts(app.appid);
    return {
      appid: app.appid,
      name: data?.name || app.name,
      type: data?.type ?? app.kind,
      added: formatSteamTimestamp(app.added),
      updated: formatSteamTimestamp(app.updated),
      releaseDate: data?.release_date?.date || undefined,
      comingSoon: data?.release_date?.coming_soon,
      developers: data?.developers,
      shortDescription: data?.short_description || undefined,
      price: facts.price,
      discountPercent: facts.discountPercent,
      reviews: facts.reviews,
      storeUrl: getSteamGameStoreUrl(app.appid),
    };
  });

  const empty =
    input.sortBy === "added"
      ? "No apps have an added date yet. An app gets one when a refresh of the game list finds it new, so apps from the first download are left out."
      : "No apps have an update time yet. They arrive with the next refresh of the game list.";
  return {
    games,
    warnings: [games.length ? undefined : empty, detailsWarning(loaded), localListWarning()].filter(
      (warning): warning is string => Boolean(warning),
    ),
  };
}
