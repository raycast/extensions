import { Cache } from "@raycast/api";
import { cachedDetails, Tag } from "./details";
import { cleanSteamGameQuery, getSteamAppIdFromInput, localListWarning, searchSteamGames } from "./games";
import { steamFetch } from "./http";

type TagVector = Map<number, number>;

const TAG_NAMES_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const tagCache = new Cache({ namespace: "tag-names" });

export async function tagNames() {
  const cached = tagCache.get("tags");
  if (cached) {
    const { fetchedAt, tags } = JSON.parse(cached) as { fetchedAt: number; tags: [number, string][] };
    if (Date.now() - fetchedAt < TAG_NAMES_MAX_AGE) return new Map(tags);
  }
  const response = await steamFetch("https://api.steampowered.com/IStoreService/GetTagList/v1/?language=english");
  if (!response.ok) return new Map<number, string>();
  const body = (await response.json()) as { response?: { tags?: { tagid: number; name: string }[] } };
  const tags = (body.response?.tags ?? []).map((tag): [number, string] => [tag.tagid, tag.name]);
  tagCache.set("tags", JSON.stringify({ fetchedAt: Date.now(), tags }));
  return new Map(tags);
}

const tagsOf = (appid: number) => cachedDetails(appid)?.tags ?? [];

// Scaled to length 1 so a game with thousands of tag votes counts the same as a small one
function unitVector(tags: Tag[]): TagVector {
  const length = Math.hypot(...tags.map((tag) => tag.weight));
  return new Map(length ? tags.map((tag) => [tag.tagid, tag.weight / length]) : []);
}

export function tasteProfile(appids: number[]) {
  const profile: TagVector = new Map();
  for (const appid of appids) {
    for (const [tagid, weight] of unitVector(tagsOf(appid))) profile.set(tagid, (profile.get(tagid) ?? 0) + weight);
  }
  return profile;
}

export function tagMatch(profile: TagVector, appid: number, names: Map<number, string>) {
  const game = unitVector(tagsOf(appid));
  const length = Math.hypot(...profile.values());
  const shared = [...game].filter(([tagid]) => profile.has(tagid));
  const dot = shared.reduce((sum, [tagid, weight]) => sum + weight * (profile.get(tagid) ?? 0), 0);
  return {
    similarity: length ? Math.round((dot / length) * 100) / 100 : 0,
    sharedTags: shared
      .sort(([a, weightA], [b, weightB]) => weightB * (profile.get(b) ?? 0) - weightA * (profile.get(a) ?? 0))
      .slice(0, 4)
      .flatMap(([tagid]) => names.get(tagid) ?? []),
  };
}

// Tool inputs can't be arrays (ray build fails to extract their schema), so games arrive as one string
export async function resolveGames(list: string) {
  const games: { appid: number; name?: string }[] = [];
  const unmatched: string[] = [];
  let searched = false;
  for (const input of list.split(/[;\n]/).slice(0, 10)) {
    const query = cleanSteamGameQuery(input);
    const appid = getSteamAppIdFromInput(query);
    searched ||= Boolean(query && !appid);
    const [match] = appid ? [{ appid }] : query ? await searchSteamGames(query, { maxResults: 1 }) : [];
    if (match) games.push(match);
    else if (query) unmatched.push(query);
  }
  return { games, unmatched, listWarning: searched ? localListWarning() : undefined };
}
