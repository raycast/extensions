import fetch from "node-fetch";
import { getCookie } from "./auth";
import { LocalStorage } from "@raycast/api";

// 缓存键定义
const CACHE_KEYS = {
  FOLLOWINGS_LIST: "bilibili_followings_list",
  USER_STATS: "bilibili_user_stats",
  FOLLOWINGS_HASH: "bilibili_followings_hash",
  MID: "bilibili_mid",
  FOLLOWED_BANGUMI_LIST: "bilibili_followed_bangumi_list",
  FOLLOWED_CINEMA_LIST: "bilibili_followed_cinema_list",
};

// 计算关注列表的哈希值，用于检测变化
function hashFollowingsList(list: UserItem[]): string {
  const ids = list.map((u) => u.mid).join(",");
  return String(
    ids.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0),
  );
}

// 从本地存储获取缓存的关注列表
async function getCachedFollowings(): Promise<UserItem[] | null> {
  try {
    const cached = await LocalStorage.getItem(CACHE_KEYS.FOLLOWINGS_LIST);
    return cached ? JSON.parse(String(cached)) : null;
  } catch {
    return null;
  }
}

// 从本地存储获取缓存的用户统计信息
export async function getCachedUserStats(): Promise<Record<
  string,
  UserItem
> | null> {
  try {
    const cached = await LocalStorage.getItem(CACHE_KEYS.USER_STATS);
    return cached ? JSON.parse(String(cached)) : null;
  } catch {
    return null;
  }
}

// 保存关注列表到本地存储
async function saveCachedFollowings(list: UserItem[]): Promise<void> {
  try {
    await LocalStorage.setItem(
      CACHE_KEYS.FOLLOWINGS_LIST,
      JSON.stringify(list),
    );
    await LocalStorage.setItem(
      CACHE_KEYS.FOLLOWINGS_HASH,
      hashFollowingsList(list),
    );
  } catch (e) {
    console.error("Failed to save followings cache:", e);
  }
}

// 缓存 Bangumi
async function getCachedFollowedBangumi(): Promise<BangumiItem[] | null> {
  try {
    const cached = await LocalStorage.getItem(CACHE_KEYS.FOLLOWED_BANGUMI_LIST);
    return cached ? JSON.parse(String(cached)) : null;
  } catch {
    return null;
  }
}

async function saveCachedFollowedBangumi(list: BangumiItem[]): Promise<void> {
  try {
    await LocalStorage.setItem(
      CACHE_KEYS.FOLLOWED_BANGUMI_LIST,
      JSON.stringify(list),
    );
  } catch (e) {
    console.error("Failed to save followed bangumi cache:", e);
  }
}

// 缓存 Cinema (Movie/TV)
async function getCachedFollowedCinema(): Promise<MovieItem[] | null> {
  try {
    const cached = await LocalStorage.getItem(CACHE_KEYS.FOLLOWED_CINEMA_LIST);
    return cached ? JSON.parse(String(cached)) : null;
  } catch {
    return null;
  }
}

async function saveCachedFollowedCinema(list: MovieItem[]): Promise<void> {
  try {
    await LocalStorage.setItem(
      CACHE_KEYS.FOLLOWED_CINEMA_LIST,
      JSON.stringify(list),
    );
  } catch (e) {
    console.error("Failed to save followed cinema cache:", e);
  }
}

// 保存用户统计信息到本地存储
export async function saveCachedUserStats(
  stats: Record<string, UserItem>,
): Promise<void> {
  try {
    await LocalStorage.setItem(CACHE_KEYS.USER_STATS, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save user stats cache:", e);
  }
}

// 获取缓存的关注列表哈希值
async function getCachedFollowingsHash(): Promise<string | null> {
  try {
    const cached = await LocalStorage.getItem(CACHE_KEYS.FOLLOWINGS_HASH);
    return cached ? String(cached) : null;
  } catch {
    return null;
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const REFERER = "https://www.bilibili.com/";

export type SearchType =
  | "video"
  | "media_bangumi"
  | "media_ft"
  | "live"
  | "article"
  | "video"
  | "media_bangumi"
  | "media_ft"
  | "live"
  | "article"
  | "bili_user";

export interface FavoriteFolder {
  id: number;
  fid: number;
  mid: number;
  attr: number;
  title: string;
  fav_state: number;
  media_count: number;
}

async function getVideoTags(bvid: string, headers: Record<string, string>) {
  const tagUrl = `https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${bvid}`;
  const res = await fetch(tagUrl, { headers });
  if (!res.ok) return "";
  const json = (await res.json()) as any;
  if (json.code !== 0 || !json.data) return "";
  const names = (json.data as any[])
    .map((t) => String(t.tag_name || "").trim())
    .filter(Boolean);
  return names.join(",");
}
export interface BilibiliResult {
  code: number;
  message: string;
  ttl: number;
  data?: {
    numResults: number;
    numPages: number;
    result?: AnyItem[];
  };
}

export type AnyItem =
  | VideoItem
  | BangumiItem
  | MovieItem
  | LiveItem
  | ArticleItem
  | UserItem;

export interface VideoItem {
  type: "video";
  id: number;
  author: string;
  mid: number;
  typename: string;
  arcurl: string;
  aid: number;
  bvid: string;
  title: string;
  description: string;
  pic: string;
  play: number;
  video_review: number;
  favorites: number;
  tag: string;
  review: number;
  pubdate: number;
  duration: string;
  like: number;
  union_page_data?: {
    badge?: string;
  };
  owner?: {
    mid: number;
    name: string;
    face: string;
  };
  stat?: {
    view: number;
    like: number;
    danmaku: number;
    coin: number;
  };
  uri?: string;
  rcmd_reason?: {
    content: string;
  };
}

export interface BangumiItem {
  type: "media_bangumi";
  media_id: number;
  title: string;
  org_title: string;
  cover: string;
  desc: string;
  season_id: string;
  url: string;
  cv: string;
  staff: string;
  areas: string;
  goto_url: string;
  pubtime: number;
  media_score: {
    score: number;
    user_count: number;
  };
  stat?: {
    view: number;
    danmaku: number;
    follow: number;
  };
  styles?: string; // e.g. "奇幻 / 漫画改 / 冒险"
  release_date_show?: string; // e.g. "2017" or "2017年"
  index_show?: string; // e.g. "已完结, 全12话" or "连载中, 每周六10点更新"
}

export interface MovieItem {
  type: "media_ft"; // Movie / TV
  media_id: number;
  title: string;
  org_title: string;
  cover: string;
  desc: string;
  season_id: string;
  url: string;
  areas: string;
  staff: string;
  actors: string;
  pubtime: number;
  goto_url: string;
  media_score: {
    score: number;
    user_count: number;
  };
  stat?: {
    view: number;
    danmaku: number;
    follow: number;
  };
  styles?: string; // e.g. "奇幻 / 漫画改 / 冒险"
  release_date_show?: string; // e.g. "2017" or "2017年"
  index_show?: string; // e.g. "已完结, 全12话"或"连载中, 每周六10点更新"
}

export interface LiveItem {
  type: "live_room"; // Returned type is usually live_room or live_user
  uid: number;
  roomid: number;
  title: string;
  uname: string;
  cover: string;
  user_cover: string; // Avatar
  online: number;
  tags: string;
  live_time: string; // Start time yyyy-MM-dd HH:mm:ss
  cate_name: string;
}

export interface ArticleItem {
  type: "article";
  id: number;
  mid: number;
  title: string;
  desc: string;
  template_id: number;
  cover: string[]; // Array of image URLs
  view: number;
  like: number;
  reply: number;
  pub_time: number;
}

export interface UserItem {
  type: "bili_user";
  mid: number;
  uname: string;
  usign: string;
  upic: string;
  videos: number;
  fans: number;
  following?: number; // Added following count
  level: number;
  gender: number;
  is_live: number;
  room_id: number;
  official_verify?: {
    type: number;
    desc: string;
  };
  res: Array<{
    aid: number;
    bvid: string;
    title: string;
    pubdate: number;
    arcurl: string;
    pic: string;
    play: string;
    duration: string;
  }>;
}

// ... existing code ...

export async function getUserCard(mid: number): Promise<UserItem | null> {
  const url = `https://api.bilibili.com/x/web-interface/card?mid=${mid}&photo=true`;
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: REFERER,
    Cookie: getCookie() || "",
  };

  try {
    const res = await fetch(url, { headers });
    const json = (await res.json()) as any;
    if (json.code === 0 && json.data && json.data.card) {
      const card = json.data.card;
      return {
        type: "bili_user",
        mid: card.mid,
        uname: card.name,
        usign: card.sign,
        upic: card.face,
        videos: json.data.archive_count || 0,
        fans: card.fans,
        following: card.attention,
        level: card.level_info?.current_level || 0,
        gender: card.sex === "男" ? 1 : card.sex === "女" ? 2 : 0,
        is_live: 0, // Not always available here
        room_id: 0,
        official_verify: card.official_verify,
        res: [],
      };
    }
  } catch (e) {
    console.error(`Failed to fetch user card for ${mid}`, e);
  }
  return null;
}

export async function getHistory(
  cursor: {
    max: number;
    view_at: number;
    business: string;
    ps: number;
  } | null = null,
): Promise<{ list: VideoItem[]; cursor: any }> {
  const cookie = getCookie();
  if (!cookie) return { list: [], cursor: null };

  let url = "https://api.bilibili.com/x/web-interface/history/cursor?ps=20";
  if (cursor) {
    url += `&max=${cursor.max}&view_at=${cursor.view_at}&business=${cursor.business}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: REFERER,
        Cookie: cookie,
      },
    });
    const json = (await response.json()) as any;
    if (json.code === 0 && json.data && json.data.list) {
      if (json.data.list.length > 0) {
        console.log(
          "Raw History Item [0]:",
          JSON.stringify(json.data.list[0], null, 2),
        );
      }
      const list = json.data.list.map((item: any) => ({
        type: "video",
        bvid: item.history.bvid,
        title: item.title,
        pic: item.cover,
        author: item.author_name,
        arcurl: `https://www.bilibili.com/video/${item.history.bvid}`,
        duration: item.duration,
        pubdate: item.view_at,
        // Fill other fields with defaults or map from available data
        id: item.history.oid,
        mid: item.author_mid,
        typename: item.tag_name,
        aid: item.history.oid,
        description: "",
        play: 0,
        video_review: 0,
        favorites: 0,
        tag: "",
        review: 0,
        like: 0,
      })) as VideoItem[];
      return { list, cursor: json.data.cursor };
    }
    return { list: [], cursor: null };
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return { list: [], cursor: null };
  }
}

export async function getSelfMid(): Promise<number | null> {
  try {
    const cachedMid = await LocalStorage.getItem(CACHE_KEYS.MID);
    if (cachedMid) {
      return Number(cachedMid);
    }
  } catch (e) {
    console.error("Failed to get cached MID", e);
  }

  const cookie = getCookie();
  if (!cookie) return null;
  try {
    const navRes = await fetch("https://api.bilibili.com/x/web-interface/nav", {
      headers: { Cookie: cookie, "User-Agent": USER_AGENT },
    });
    const navJson = (await navRes.json()) as any;
    if (navJson.code === 0) {
      const mid = navJson.data.mid;
      await LocalStorage.setItem(CACHE_KEYS.MID, String(mid));
      return mid;
    }
  } catch (e) {
    console.error("Failed to fetch self mid", e);
  }
  return null;
}

export async function getFavoriteFolders(
  mid: number,
): Promise<FavoriteFolder[]> {
  const cookie = getCookie();
  if (!cookie) return [];

  try {
    const folderRes = await fetch(
      `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${mid}`,
      { headers: { Cookie: cookie, "User-Agent": USER_AGENT } },
    );
    const folderJson = (await folderRes.json()) as any;
    if (folderJson.code === 0 && folderJson.data && folderJson.data.list) {
      return folderJson.data.list as FavoriteFolder[];
    }
  } catch (e) {
    console.error("Failed to fetch favorite folders", e);
  }
  return [];
}

export async function getFavorites(
  mediaId?: number,
  page: number = 1,
  keyword: string = "",
): Promise<VideoItem[]> {
  const cookie = getCookie();
  if (!cookie) return [];

  let targetMediaId = mediaId;

  if (!targetMediaId) {
    const mid = await getSelfMid();
    if (mid) {
      const folders = await getFavoriteFolders(mid);
      if (folders.length > 0) {
        targetMediaId = folders[0].id; // Default to first folder
      }
    }
  }

  if (!targetMediaId) return [];

  try {
    const resUrl = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${targetMediaId}&ps=20&pn=${page}&keyword=${encodeURIComponent(
      keyword,
    )}&order=mtime&type=0&tid=0&platform=web`;
    const resRes = await fetch(resUrl, {
      headers: { Cookie: cookie, "User-Agent": USER_AGENT },
    });
    const resJson = (await resRes.json()) as any;
    if (resJson.code === 0 && resJson.data && resJson.data.medias) {
      if (resJson.data.medias.length > 0 && page === 1) {
        console.log(
          "Raw Favorites Item [0]:",
          JSON.stringify(resJson.data.medias[0], null, 2),
        );
      }
      return resJson.data.medias.map((item: any) => ({
        type: "video",
        bvid: item.bvid,
        title: item.title,
        pic: item.cover,
        author: item.upper.name,
        arcurl: `https://www.bilibili.com/video/${item.bvid}`,
        duration: formatDuration(item.duration),
        pubdate: item.ctime,
        id: item.id,
        mid: item.upper.mid,
        typename: "",
        aid: item.id,
        description: item.intro,
        play: item.cnt_info.play,
        video_review: item.cnt_info.danmaku,
        favorites: item.cnt_info.collect,
        tag: "",
        review: item.cnt_info.reply,
        like: 0,
      }));
    }
  } catch (e) {
    console.error("Failed to fetch favorites", e);
  }

  return [];
}

export async function getAllFavorites(
  mediaId: number,
  keyword: string = "",
): Promise<VideoItem[]> {
  const allItems: VideoItem[] = [];
  let page = 1;

  let hasMore = true;

  while (hasMore) {
    const items = await getFavorites(mediaId, page, keyword);
    if (items.length === 0) break;
    allItems.push(...items);
    if (items.length < 20) hasMore = false;
    page++;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allItems;
}

export async function getRecommendations(): Promise<VideoItem[]> {
  // Top Rcmd: https://api.bilibili.com/x/web-interface/index/top/feed/rcmd?y_num=5&fresh_type=4&feed_version=V9&fetch_row=1&fresh_idx=1&fresh_idx_1h=1&brush=1&homepage_ver=1&ps=20
  const url =
    "https://api.bilibili.com/x/web-interface/index/top/feed/rcmd?ps=20";
  const cookie = getCookie();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: REFERER,
        Cookie: cookie, // Helps with personalized recommendations
      },
    });
    const json = (await response.json()) as any;
    if (json.code === 0 && json.data && json.data.item) {
      return json.data.item.map((item: any) => ({
        type: "video",
        bvid: item.bvid,
        title: item.title,
        pic: item.pic,
        author: item.owner.name,
        arcurl: item.uri,
        duration: formatDuration(String(item.duration)),
        pubdate: item.pubdate,
        id: item.id,
        mid: item.owner.mid,
        typename: "",
        aid: item.id,
        description: "",
        play: item.stat.view,
        video_review: item.stat.danmaku,
        favorites: 0,
        tag: "",
        review: 0,
        like: item.stat.like,
        owner: {
          mid: item.owner.mid,
          name: item.owner.name,
          face: item.owner.face,
        },
      }));
    }
  } catch (e) {
    console.error("Failed to fetch recommendations", e);
  }
  return [];
}

export async function getPopularVideos(page: number = 1): Promise<VideoItem[]> {
  const url = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=${page}`;
  const rawCookie = getCookie();
  const cookie = rawCookie || "buvid3=infoc;";

  console.log(
    `Fetching popular videos page ${page} with cookie length: ${cookie.length}`,
  );

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: REFERER,
        Cookie: cookie,
      },
    });

    if (!response.ok) {
      console.error(
        `Popular API validation failed: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as any;
    console.log(`Popular API Response Code: ${json.code}`);

    if (json.code === 0 && json.data && json.data.list) {
      console.log(`Found ${json.data.list.length} popular videos`);
      return json.data.list.map((item: any) => ({
        type: "video",
        bvid: item.bvid,
        title: item.title,
        pic: item.pic,
        author: item.owner.name,
        arcurl:
          item.short_link_v2 || `https://www.bilibili.com/video/${item.bvid}`,
        duration: formatDuration(String(item.duration)),
        pubdate: item.pubdate,
        id: item.aid,
        mid: item.owner.mid,
        typename: item.tname,
        aid: item.aid,
        description: item.desc || "",
        play: item.stat.view,
        video_review: item.stat.danmaku,
        favorites: item.stat.favorite,
        tag: item.rcmd_reason?.content || "",
        review: item.stat.reply,
        like: item.stat.like,
        owner: {
          mid: item.owner.mid,
          name: item.owner.name,
          face: item.owner.face,
        },
      }));
    } else {
      console.log("Popular API returned no list:", JSON.stringify(json));
    }
  } catch (e) {
    console.error("Failed to fetch popular videos", e);
  }
  return [];
}

export async function getFollowedBangumi(
  page: number = 1,
  forceRefresh: boolean = false,
  fetchAll: boolean = false,
): Promise<BangumiItem[]> {
  const mid = await getSelfMid();
  if (!mid) return [];

  if (page === 1 && !forceRefresh && !fetchAll) {
    const cached = await getCachedFollowedBangumi();
    if (cached && cached.length > 0 && cached[0].stat !== undefined) {
      // If we are asking for all items but cache has less than 15, we might assume there's no more, OR we don't know the total.
      // But typically we only cache the first page. If we need all, we should probably fetch them.
      return cached;
    }
  }

  let allItems: BangumiItem[] = [];
  let currentPage = page;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.bilibili.com/x/space/bangumi/follow/list?type=1&follow_status=0&pn=${currentPage}&ps=15&vmid=${mid}`;
    const cookie = getCookie();

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: REFERER,
          Cookie: cookie || "",
        },
      });
      const json = (await response.json()) as any;
      if (json.code === 0 && json.data && json.data.list) {
        if (json.data.list.length > 0 && currentPage === 1) {
          console.log(
            "RAW BANGUMI:",
            JSON.stringify(json.data.list[0], null, 2),
          );
        }
        const list = json.data.list.map((item: any) => ({
          type: "media_bangumi",
          media_id: item.media_id,
          title: item.title,
          org_title: item.title,
          cover: item.cover,
          desc: item.evaluate,
          season_id: String(item.season_id),
          url: `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
          cv: "",
          staff: "",
          areas: item.areas
            ? item.areas.map((a: any) => a.name).join(", ")
            : "",
          goto_url: "",
          pubtime: 0,
          media_score: {
            score: item.rating?.score || 0,
            user_count: item.rating?.count || 0,
          },
          stat: {
            view: item.stat?.view || 0,
            danmaku: item.stat?.danmaku || 0,
            follow: item.stat?.series_follow || item.stat?.follow || 0,
          },
          styles: item.styles ? item.styles.join(" / ") : "",
          release_date_show: item.publish?.release_date_show
            ? item.publish.release_date_show.substring(0, 4)
            : "",
          index_show: item.new_ep?.index_show || "",
        })) as BangumiItem[];

        allItems = allItems.concat(list);

        if (currentPage === 1 && !fetchAll) {
          await saveCachedFollowedBangumi(list);
        }

        if (!fetchAll || list.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error("Failed to fetch followed bangumi", e);
      hasMore = false;
    }
  }

  // Update cache with all merged items if fetchAll was requested
  if (fetchAll && allItems.length > 0) {
    await saveCachedFollowedBangumi(allItems);
  }

  return allItems;
}

export async function getFollowedCinema(
  page: number = 1,
  forceRefresh: boolean = false,
  fetchAll: boolean = false,
): Promise<MovieItem[]> {
  const mid = await getSelfMid();
  if (!mid) return [];

  if (page === 1 && !forceRefresh && !fetchAll) {
    const cached = await getCachedFollowedCinema();
    if (cached && cached.length > 0 && cached[0].stat !== undefined) {
      return cached;
    }
  }

  let allItems: MovieItem[] = [];
  let currentPage = page;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.bilibili.com/x/space/bangumi/follow/list?type=2&follow_status=0&pn=${currentPage}&ps=15&vmid=${mid}`;
    const cookie = getCookie();

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: REFERER,
          Cookie: cookie || "",
        },
      });
      const json = (await response.json()) as any;
      if (json.code === 0 && json.data && json.data.list) {
        const list = json.data.list.map((item: any) => ({
          type: "media_ft",
          media_id: item.media_id,
          title: item.title,
          org_title: item.title,
          cover: item.cover,
          desc: item.evaluate,
          season_id: String(item.season_id),
          url: `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
          areas: item.areas
            ? item.areas.map((a: any) => a.name).join(", ")
            : "",
          staff: "",
          actors: "",
          pubtime: 0,
          goto_url: "",
          media_score: {
            score: item.rating?.score || 0,
            user_count: item.rating?.count || 0,
          },
          stat: {
            view: item.stat?.view || 0,
            danmaku: item.stat?.danmaku || 0,
            follow: item.stat?.series_follow || item.stat?.follow || 0,
          },
          styles: item.styles ? item.styles.join(" / ") : "",
          release_date_show: item.publish?.release_date_show
            ? item.publish.release_date_show.substring(0, 4)
            : "",
          index_show: item.new_ep?.index_show || "",
        })) as MovieItem[];

        allItems = allItems.concat(list);

        if (currentPage === 1 && !fetchAll) {
          await saveCachedFollowedCinema(list);
        }

        if (!fetchAll || list.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error("Failed to fetch followed cinema", e);
      hasMore = false;
    }
  }

  // Update cache with all merged items if fetchAll was requested
  if (fetchAll && allItems.length > 0) {
    await saveCachedFollowedCinema(allItems);
  }

  return allItems;
}

export async function getFollowings(
  page: number = 1,
  forceRefresh: boolean = false,
  fetchAll: boolean = false,
): Promise<UserItem[]> {
  const mid = await getSelfMid();
  if (!mid) return [];

  // 只在第一页且不强制刷新时使用缓存
  if (page === 1 && !forceRefresh && !fetchAll) {
    const cached = await getCachedFollowings();
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  let allUsers: UserItem[] = [];
  let currentPage = page;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.bilibili.com/x/relation/followings?vmid=${mid}&pn=${currentPage}&ps=20&order=desc`;
    const cookie = getCookie();

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: REFERER,
          Cookie: cookie || "",
        },
      });
      const json = (await response.json()) as any;
      if (json.code === 0 && json.data?.list) {
        const users = json.data.list.map((item: any) => ({
          type: "bili_user",
          mid: item.mid,
          uname: item.uname,
          usign: item.sign,
          upic: item.face,
          fans: 0,
          videos: 0,
          level: item.vip?.vipType || 0,
          official_verify: {
            type: item.official_verify?.type || -1,
            desc: item.official_verify?.desc || "",
          },
        })) as UserItem[];

        allUsers = allUsers.concat(users);

        if (currentPage === 1 && !fetchAll) {
          await saveCachedFollowings(users);
        }

        if (!fetchAll || users.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error("Failed to fetch followings", e);
      hasMore = false;
    }
  }

  if (fetchAll && allUsers.length > 0) {
    await saveCachedFollowings(allUsers);
  }

  return allUsers;
}

// 新增：检查关注列表是否有变化
export async function checkFollowingsChanged(): Promise<boolean> {
  const mid = await getSelfMid();
  if (!mid) return false;

  const url = `https://api.bilibili.com/x/relation/followings?vmid=${mid}&pn=1&ps=20&order=desc`;
  const cookie = getCookie();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: REFERER,
        Cookie: cookie || "",
      },
    });
    const json = (await response.json()) as any;
    if (json.code === 0 && json.data && json.data.list) {
      const newList = json.data.list.map((item: any) => ({
        type: "bili_user",
        mid: item.mid,
        uname: item.uname,
        usign: item.sign,
        upic: item.face,
        videos: 0,
        fans: 0,
        level: 0,
        gender: 0,
        is_live: 0,
        room_id: 0,
        res: [],
      }));

      const oldHash = await getCachedFollowingsHash();
      const newHash = hashFollowingsList(newList);

      return oldHash !== newHash;
    }
  } catch (e) {
    console.error("Failed to check followings change", e);
  }
  return false;
}

export async function searchBilibili(
  keyword: string,
  type: SearchType,
  page: number = 1,
): Promise<AnyItem[]> {
  const params = new URLSearchParams({
    keyword,
    search_type: type,
    page: String(page),
  });

  const url = `https://api.bilibili.com/x/web-interface/search/type?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://www.bilibili.com/",
        Cookie: "buvid3=infoc;", // Sometimes needed to avoid -412
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = (await response.json()) as BilibiliResult;

    if (json.code !== 0) {
      console.error("Bilibili API Error:", json.message);
      return [];
    }

    // Determine result list based on type
    const results = (json.data?.result || []) as any[];

    if (type === "video") {
      return results.map((item) => ({
        ...item,
        type: "video",
        owner: {
          mid: item.mid,
          name: item.author,
          face: item.upic, // Map upic to owner.face
        },
      }));
    }

    return results as AnyItem[];
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}

export function formatNumber(num: number): string {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + "亿";
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return String(num);
}

export function formatDuration(str: string): string {
  if (!str) return "00:00";

  // If it's pure seconds (no colon)
  if (!String(str).includes(":")) {
    const seconds = parseInt(str, 10);
    if (isNaN(seconds)) return str;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    } else {
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
  }

  // If it is mm:ss or hh:mm:ss
  const parts = str.split(":").map((p) => parseInt(p, 10));

  // If already h:m:s (3 parts), return as is (maybe clean up leading zeros if wanted, but standard is fine)
  if (parts.length === 3) return str;

  if (parts.length === 2) {
    let [m] = parts;
    const [, s] = parts;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      m = m % 60;
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
  }

  return str;
}

export function ensureHttps(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (!url.startsWith("http")) return `https://${url}`;
  return url;
}

export interface VideoStats {
  view: number;
  danmaku: number;
  reply: number;
  favorite: number;
  coin: number;
  share: number;
  like: number;
  tag?: string; // Add tag to stats for convenience or create a separate Details interface
  desc?: string;
  owner?: {
    mid: number;
    name: string;
    face: string;
  };
}

export async function getVideoDetails(
  bvid: string,
): Promise<VideoStats | null> {
  const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

  try {
    const rawCookie = getCookie() || "";
    const cookieHeader = rawCookie
      ? `${rawCookie}; buvid3=infoc;`
      : "buvid3=infoc;";

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Referer: "https://www.bilibili.com/",
      Cookie: cookieHeader,
    };

    const viewRes = await fetch(viewUrl, { headers });
    if (!viewRes.ok) return null;

    const viewJson = (await viewRes.json()) as any;
    if (viewJson.code !== 0 || !viewJson.data) return null;

    // ✅ 稳定获取 tags：detail/tag
    const tagName = await getVideoTags(bvid, headers);

    return {
      ...viewJson.data.stat,
      tag: tagName || viewJson.data.tname || "",
      desc: viewJson.data.desc,
      owner: viewJson.data.owner,
    } as VideoStats;
  } catch (error) {
    console.error("Failed to fetch video details:", error);
    return null;
  }
}

export function getProfileUrl(mid: number): string {
  return `https://space.bilibili.com/${mid}`;
}

export interface SeasonStats {
  staff: string;
  actors: string;
  score: number;
  user_count: number;
}

export async function getSeasonDetails(
  season_id: string,
): Promise<SeasonStats | null> {
  const url = `https://api.bilibili.com/pgc/view/web/season?season_id=${season_id}`;

  try {
    const rawCookie = getCookie() || "";
    const cookieHeader = rawCookie
      ? `${rawCookie}; buvid3=infoc;`
      : "buvid3=infoc;";

    const headers = {
      "User-Agent": USER_AGENT,
      Referer: REFERER,
      Cookie: cookieHeader,
    };

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const json = (await res.json()) as any;
    if (json.code !== 0 || !json.result) return null;

    return {
      staff: json.result.staff || "",
      actors: json.result.actors || "",
      score: json.result.rating?.score || 0,
      user_count: json.result.rating?.count || 0,
    } as SeasonStats;
  } catch (error) {
    console.error(`Failed to fetch season details for ${season_id}:`, error);
    return null;
  }
}
