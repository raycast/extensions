export type Provider = "7tv" | "bttv" | "ffz";
export type SortMode =
  | "popular"
  | "recent"
  | "trending"
  | "name-asc"
  | "name-desc";
export interface EmoteFile {
  name: string;
  width: number;
  height: number;
  format: string;
  url?: string;
  static_name?: string;
}
export interface EmoteUsage {
  approvedPersonal?: boolean;
  deniedPersonal?: boolean;
  private?: boolean;
  publicListed?: boolean;
  nsfw?: boolean;
}
export interface Emote {
  id: string;
  name: string;
  provider?: Provider; // Favorites saved before provider support are 7TV emotes.
  owner?: { display_name: string };
  host: { url: string; files: EmoteFile[] };
  animated?: boolean;
  usage?: EmoteUsage;
}
export const PAGE_SIZE = 60;
export const BTTV_PAGE_SIZE = 50;
export const PROVIDERS: { id: Provider; title: string; sorts: SortMode[] }[] = [
  {
    id: "7tv",
    title: "7TV",
    sorts: ["popular", "recent", "trending"],
  },
  { id: "bttv", title: "BetterTTV", sorts: ["popular", "recent", "trending"] },
  {
    id: "ffz",
    title: "FrankerFaceZ",
    sorts: ["popular", "recent", "name-asc", "name-desc"],
  },
];
export const SORT_TITLES: Record<SortMode, string> = {
  popular: "Popular (All Time)",
  recent: "Recently Created",
  trending: "Trending Today",
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
};
export function getSortTitle(provider: Provider, sort: SortMode, query = "") {
  if (provider === "bttv") {
    if (query.trim()) return "Search Results";
    if (sort === "trending") return "Trending This Week";
    if (sort === "recent") return "Recently Shared";
  }
  return SORT_TITLES[sort];
}
const https = (url: string) => (url.startsWith("//") ? `https:${url}` : url);
const fileUrl = (e: Emote, f: EmoteFile) =>
  https(f.url ?? `${e.host.url}/${f.name}`);
export const getEmoteKey = (e: Emote) => `${e.provider ?? "7tv"}:${e.id}`;
// Every provider names its files after their scale ("2x.gif").
const scaleOf = (f: EmoteFile) => parseInt(f.name, 10);
// Picks the largest file at or below `size`, or the smallest one above it when
// none is that small, so the paste is never heavier than requested if avoidable.
export function getEmoteFile(e: Emote, size: number) {
  const formats = e.animated
    ? ["gif", "png", "webp", "avif"]
    : ["png", "webp", "avif"];
  for (const ext of formats) {
    const files = e.host.files
      .filter(
        (f) => f.format.toLowerCase() === ext && !f.name.includes("_static"),
      )
      .sort((a, b) => scaleOf(a) - scaleOf(b));
    const file = files.filter((f) => scaleOf(f) <= size).at(-1) ?? files[0];
    if (file) return { url: fileUrl(e, file), ext };
  }
  throw new Error(`No usable image for ${e.name}`);
}
export function getPreviewUrl(e: Emote) {
  const files = e.host.files
    .filter(
      (f) => f.format.toLowerCase() === "webp" && !f.name.includes("_static"),
    )
    .sort((a, b) => a.height - b.height);
  const file = files.find((f) => f.height >= 64) ?? files.at(-1);
  return file ? fileUrl(e, file) : getEmoteFile(e, 4).url;
}
export function getEmotePage(e: Emote) {
  switch (e.provider) {
    case "bttv":
      return `https://betterttv.com/emotes/${e.id}`;
    case "ffz":
      return `https://www.frankerfacez.com/emoticon/${e.id}`;
    default:
      return `https://7tv.app/emotes/${e.id}`;
  }
}
export interface SearchArgs {
  provider: Provider;
  sort: SortMode;
  query: string;
  page: number;
  animatedOnly: boolean;
  cursor?: string;
}
export interface SearchResult {
  items: Emote[];
  total?: number;
  hasMore: boolean;
  nextCursor?: string;
}
const SEVENTV_SORTS: Record<SortMode, string> = {
  popular: "TOP_ALL_TIME",
  recent: "UPLOAD_DATE",
  trending: "TRENDING_DAILY",
  "name-asc": "NAME_ALPHABETICAL",
  "name-desc": "NAME_ALPHABETICAL",
};
const QUERY = `query($query:String,$page:Int,$perPage:Int,$sort:Sort!,$filters:Filters){
  emotes{search(query:$query,page:$page,perPage:$perPage,sort:$sort,filters:$filters){
    totalCount pageCount items{id defaultName flags{animated} owner{mainConnection{platformDisplayName}} images{url mime width height}}
  }}
}`;
interface SevenTVEmote {
  id: string;
  defaultName: string;
  flags: { animated: boolean };
  owner?: { mainConnection?: { platformDisplayName: string } };
  images: { url: string; mime: string; width: number; height: number }[];
}
interface BTTVEmote {
  id: string;
  code: string;
  imageType: string;
  animated: boolean;
  user?: { displayName: string };
}
interface FFZEmote {
  id: number;
  name: string;
  width: number;
  height: number;
  owner?: { display_name: string };
  urls: Record<string, string>;
  animated?: Record<string, string>;
}
export async function searchEmotes(
  args: SearchArgs,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<SearchResult> {
  const { provider, sort, query, page, animatedOnly } = args;
  if (provider === "7tv") {
    const response = await fetcher("https://api.7tv.app/v4/gql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        query: QUERY,
        variables: {
          query,
          page,
          perPage: PAGE_SIZE,
          sort: {
            sortBy: SEVENTV_SORTS[sort],
            order: sort === "name-asc" ? "ASCENDING" : "DESCENDING",
          },
          filters: {
            exactMatch: false,
            ...(animatedOnly ? { animated: true } : {}),
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`7TV returned ${response.status}`);
    const body = (await response.json()) as {
      errors?: { message: string }[];
      data?: {
        emotes: {
          search: {
            items: SevenTVEmote[];
            totalCount: number;
            pageCount: number;
          };
        };
      };
    };
    if (body.errors?.length) throw new Error(body.errors[0].message);
    const result = body.data?.emotes.search;
    if (!result) throw new Error("7TV returned no search data");
    return {
      total: result.totalCount,
      hasMore: page < result.pageCount,
      items: result.items.map((e) => ({
        id: e.id,
        name: e.defaultName,
        provider,
        animated: e.flags.animated,
        owner: e.owner?.mainConnection
          ? { display_name: e.owner.mainConnection.platformDisplayName }
          : undefined,
        host: {
          url: `https://cdn.7tv.app/emote/${e.id}`,
          files: e.images.map((i) => ({
            name: new URL(i.url).pathname.split("/").pop()!,
            url: i.url,
            format: i.mime.split("/")[1],
            width: i.width,
            height: i.height,
          })),
        },
      })),
    };
  }
  if (provider === "bttv") {
    const params = new URLSearchParams({ limit: String(BTTV_PAGE_SIZE) });
    if (animatedOnly) params.set("type", "animated");
    let path: string;
    if (query) {
      path = "/search";
      params.set("query", query);
      params.set("offset", String((page - 1) * BTTV_PAGE_SIZE));
    } else if (sort === "recent") {
      path = "";
      if (args.cursor) params.set("before", args.cursor);
    } else {
      path = sort === "trending" ? "/trending" : "/top";
      if (args.cursor) params.set("before", args.cursor);
    }
    const response = await fetcher(
      `https://api.betterttv.net/3/emotes/shared${path}?${params}`,
      {
        signal,
        headers: { Referer: "https://betterttv.com/" },
      },
    );
    if (!response.ok) throw new Error(`BetterTTV returned ${response.status}`);
    const raw = (await response.json()) as (
      | BTTVEmote
      | { id: string; emote: BTTVEmote }
    )[];
    const items = raw
      .map((e) => ("emote" in e ? e.emote : e))
      .filter((e) => !animatedOnly || e.animated)
      .map(
        (e): Emote => ({
          id: e.id,
          name: e.code,
          provider,
          animated: e.animated,
          owner: e.user ? { display_name: e.user.displayName } : undefined,
          host: {
            url: `https://cdn.betterttv.net/emote/${e.id}`,
            files: [1, 2, 3].map((s) => ({
              name: `${s}x.${e.imageType}`,
              url: `https://cdn.betterttv.net/emote/${e.id}/${s}x`,
              format: e.imageType,
              width: 28 * s,
              height: 28 * s,
            })),
          },
        }),
      );
    const last = raw.at(-1);
    return {
      items,
      hasMore: raw.length === BTTV_PAGE_SIZE,
      nextCursor: !query ? last?.id : undefined,
    };
  }
  const sorts: Partial<Record<SortMode, string>> = {
    popular: "count-desc",
    recent: "created-desc",
    "name-asc": "name-asc",
    "name-desc": "name-desc",
  };
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(PAGE_SIZE),
    sort: sorts[sort] ?? "count-desc",
  });
  if (animatedOnly) params.set("animated", "true");
  const response = await fetcher(
    `https://api.frankerfacez.com/v1/emoticons?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`FrankerFaceZ returned ${response.status}`);
  const body = (await response.json()) as {
    _total: number;
    _pages: number;
    emoticons: FFZEmote[];
  };
  return {
    total: body._total,
    hasMore: page < body._pages,
    items: body.emoticons.map((e) => {
      const animated = !!e.animated && Object.keys(e.animated).length > 0;
      return {
        id: String(e.id),
        name: e.name,
        provider,
        animated,
        owner: e.owner,
        host: {
          url: "",
          files: Object.entries(animated ? e.animated! : e.urls).map(
            ([scale, url]) => ({
              name: `${scale}x.${animated ? "gif" : "png"}`,
              url: animated ? `${https(url)}.gif` : https(url),
              format: animated ? "GIF" : "PNG",
              width: e.width * Number(scale),
              height: e.height * Number(scale),
            }),
          ),
        },
      };
    }),
  };
}
