import { steamFetch } from "./http";

export type SteamNewsItem = {
  gid: string;
  title: string;
  url: string;
  author?: string;
  contents?: string;
  feedlabel?: string;
  date: number;
  feed_type?: number;
};

export async function getGameNews(appid: number, options: { count?: number; officialOnly?: boolean } = {}) {
  const url = new URL("https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/");
  url.searchParams.set("appid", String(appid));
  url.searchParams.set("count", String(options.count ?? 10));
  url.searchParams.set("maxlength", "500");
  url.searchParams.set("format", "json");
  if (options.officialOnly) url.searchParams.set("feeds", "steam_community_announcements");

  const response = await steamFetch(url);
  if (!response.ok) {
    throw new Error(`Steam could not load news for app ${appid} (${response.status}).`);
  }
  const body = (await response.json()) as { appnews?: { newsitems?: SteamNewsItem[] } };
  return body.appnews?.newsitems ?? [];
}

// News bodies mix HTML with Steam's BBCode tags
export function newsText(contents?: string) {
  return (contents ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[\/?[a-z0-9*]+(?:=[^\]]*)?\]/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
