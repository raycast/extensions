import { Cache } from "@raycast/api";
import { GameData } from "../types";
import { getSteamGameData } from "./games";
import { steamFetch } from "./http";
import { storeCountry } from "./region";

export type Tag = { tagid: number; weight: number };
export type Reviews = { label?: string; positivePercent?: number; count: number };

export type CachedDetails = {
  data: GameData;
  icon?: string;
  // Steam user tags weighted by votes and the review summary; only the batch lookup returns them
  tags?: Tag[];
  reviews?: Reviews;
  // Batch entries lack Metacritic and categories, which the single-game lookup fills in
  full: boolean;
  fetchedAt: number;
};

type StoreItem = {
  appid: number;
  success?: number;
  name?: string;
  type?: number;
  basic_info?: { short_description?: string; developers?: { name: string }[]; publishers?: { name: string }[] };
  assets?: { asset_url_format?: string; header?: string; community_icon?: string };
  release?: {
    steam_release_date?: number;
    is_coming_soon?: boolean;
    coming_soon_display?: string;
    custom_release_date_message?: string;
  };
  platforms?: { windows?: boolean; mac?: boolean; steamos_linux?: boolean };
  tags?: Tag[];
  is_free?: boolean;
  reviews?: { summary_filtered?: { review_count?: number; percent_positive?: number; review_score_label?: string } };
  best_purchase_option?: {
    formatted_final_price?: string;
    final_price_in_cents?: string;
    original_price_in_cents?: string;
    discount_pct?: number;
  };
};

const MAX_AGE = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;
const cache = new Cache({ namespace: "game-details-v3", capacity: 20 * 1024 * 1024 });

// en-US because appdetails, the other source of these dates, only sends English text
const dateFormat = (timeZone: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", ...options, timeZone });

// Steam dates a release by its Pacific-time day, and coming_soon_display says how precise to be,
// matching the "November 2026" or "Q4 2026" that appdetails shows for the same game
function formatRelease(release: NonNullable<StoreItem["release"]>) {
  const seconds = release.steam_release_date;
  const display = release.coming_soon_display;
  if (!seconds || display === "text_comingsoon") return release.custom_release_date_message ?? "Coming soon";
  const date = new Date(seconds * 1000);
  const pacific = "America/Los_Angeles";
  if (display === "date_month") return dateFormat(pacific, { month: "long" }).format(date);
  if (display === "date_year") return dateFormat(pacific, {}).format(date);
  if (display === "date_quarter") {
    const month = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: pacific }).format(date));
    return `Q${Math.ceil(month / 3)} ${dateFormat(pacific, {}).format(date)}`;
  }
  return dateFormat(pacific).format(date);
}

// appdetails sends that same day as text ("18 Apr, 2011"); anything without a day, like "Q2 2026", stays as is
function formatReleaseText(text: string) {
  if (!/\b\d{1,2}\b/.test(text) || !/\b\d{4}\b/.test(text) || !/[A-Za-z]{3}/.test(text)) return text;
  const parsed = Date.parse(`${text} UTC`);
  return Number.isNaN(parsed) ? text : dateFormat("UTC").format(new Date(parsed));
}

const STORE_TYPES: Record<number, string> = {
  0: "game",
  1: "demo",
  2: "mod",
  3: "video",
  4: "dlc",
  6: "software",
  7: "video",
  10: "hardware",
  11: "music",
  13: "tool",
};

// A Cache read costs about a quarter millisecond, and My Games reads every owned game several times per render
const memory = new Map<number, CachedDetails | undefined>();

function readCache(appid: number) {
  const raw = cache.get(String(appid));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as CachedDetails;
  } catch {
    return undefined;
  }
}

export function cachedDetails(appid: number): CachedDetails | undefined {
  if (!memory.has(appid)) memory.set(appid, readCache(appid));
  return memory.get(appid);
}

export const isFresh = (entry?: CachedDetails) => Boolean(entry && Date.now() - entry.fetchedAt < MAX_AGE);

// Steam returns nothing for delisted apps, so without this every open asks about them again
const MISSING_KEY = "missing";
let missing: Record<number, number> | undefined;

function missingSince() {
  if (!missing) {
    try {
      missing = JSON.parse(cache.get(MISSING_KEY) ?? "{}") as Record<number, number>;
    } catch {
      missing = {};
    }
  }
  return missing;
}

function markMissing(appids: number[]) {
  const now = Date.now();
  const kept = Object.entries(missingSince()).filter(([, since]) => now - since < MAX_AGE);
  missing = Object.fromEntries([...kept, ...appids.map((appid) => [appid, now])]);
  cache.set(MISSING_KEY, JSON.stringify(missing));
}

export const needsDetails = (appid: number) => {
  const entry = cachedDetails(appid);
  if (appid <= 0 || (isFresh(entry) && entry?.tags && entry.reviews)) return false;
  return Date.now() - (missingSince()[appid] ?? 0) >= MAX_AGE;
};

// Only the fields the views read, so a cached game costs a couple of kilobytes
function store(
  appid: number,
  data: GameData,
  { full, icon, tags, reviews }: { full: boolean; icon?: string; tags?: Tag[]; reviews?: Reviews },
) {
  const kept = {
    type: data.type,
    name: data.name,
    steam_appid: data.steam_appid,
    is_free: data.is_free,
    short_description: data.short_description,
    header_image: data.header_image,
    website: data.website,
    developers: data.developers,
    publishers: data.publishers,
    price_overview: data.price_overview,
    metacritic: data.metacritic,
    categories: data.categories,
    genres: data.genres,
    platforms: data.platforms,
    release_date: data.release_date,
  } as GameData;
  const existing = cachedDetails(appid);
  const entry: CachedDetails = {
    data: kept,
    icon: icon ?? existing?.icon,
    tags: tags ?? existing?.tags,
    reviews: reviews ?? existing?.reviews,
    full,
    fetchedAt: Date.now(),
  };
  cache.set(String(appid), JSON.stringify(entry));
  memory.set(appid, entry);
  return entry;
}

export async function fetchFullDetails(appid: number) {
  const data = await getSteamGameData(appid);
  if (data.release_date?.date) data.release_date.date = formatReleaseText(data.release_date.date);
  return store(appid, data, { full: true });
}

function fromStoreItem(item: StoreItem): { data: GameData; icon?: string } {
  const asset = (file?: string) =>
    file && item.assets?.asset_url_format
      ? `https://shared.akamai.steamstatic.com/store_item_assets/${item.assets.asset_url_format.replace("${FILENAME}", file)}`
      : undefined;
  const data = {
    type: STORE_TYPES[item.type ?? 0] ?? "game",
    name: item.name ?? "",
    steam_appid: item.appid,
    short_description: item.basic_info?.short_description ?? "",
    header_image: asset(item.assets?.header) ?? "",
    developers: item.basic_info?.developers?.map((developer) => developer.name) ?? [],
    publishers: item.basic_info?.publishers?.map((publisher) => publisher.name) ?? [],
    platforms: {
      windows: Boolean(item.platforms?.windows),
      mac: Boolean(item.platforms?.mac),
      linux: Boolean(item.platforms?.steamos_linux),
    },
    release_date: {
      coming_soon: Boolean(item.release?.is_coming_soon),
      date: item.release ? formatRelease(item.release) : "",
    },
  } as GameData;
  const option = item.best_purchase_option;
  // Only set when Steam sent a price, so merging keeps an older one rather than erasing it
  if (option?.formatted_final_price) {
    data.price_overview = {
      currency: "",
      initial: Number(option.original_price_in_cents ?? 0),
      final: Number(option.final_price_in_cents ?? 0),
      discount_percent: option.discount_pct ?? 0,
      final_formatted: option.formatted_final_price,
    };
  }
  if (item.is_free) data.is_free = true;
  const icon = item.assets?.community_icon
    ? `https://shared.fastly.steamstatic.com/community_assets/images/apps/${item.appid}/${item.assets.community_icon}.jpg`
    : undefined;
  return { data, icon };
}

export async function fetchBatchDetails(appids: number[]) {
  const stale = [...new Set(appids)].filter(needsDetails);
  let failed = 0;
  for (let start = 0; start < stale.length; start += BATCH_SIZE) {
    const ids = stale.slice(start, start + BATCH_SIZE);
    const url = new URL("https://api.steampowered.com/IStoreBrowseService/GetItems/v1/");
    url.searchParams.set(
      "input_json",
      JSON.stringify({
        ids: ids.map((appid) => ({ appid })),
        context: { language: "english", country_code: await storeCountry() },
        data_request: {
          include_basic_info: true,
          include_assets: true,
          include_release: true,
          include_platforms: true,
          include_tag_count: 20,
          include_reviews: true,
        },
      }),
    );
    const response = await steamFetch(url);
    if (!response.ok) {
      failed += ids.length;
      continue;
    }
    const body = (await response.json()) as { response?: { store_items?: StoreItem[] } };
    const found = new Set(
      (body.response?.store_items ?? []).filter((item) => item.success && item.appid).map((item) => item.appid),
    );
    const notFound = ids.filter((appid) => !found.has(appid));
    if (notFound.length) markMissing(notFound);
    for (const item of body.response?.store_items ?? []) {
      if (!item.success || !item.appid) continue;
      const existing = cachedDetails(item.appid);
      const { data, icon } = fromStoreItem(item);
      // Keeps an older price and ratings on show, but not full, so the next hover refreshes them
      const summary = item.reviews?.summary_filtered;
      store(item.appid, existing ? { ...existing.data, ...data } : data, {
        full: false,
        icon,
        tags: item.tags ?? [],
        reviews: {
          label: summary?.review_score_label,
          positivePercent: summary?.percent_positive,
          count: summary?.review_count ?? 0,
        },
      });
    }
  }
  return { requested: stale.length, failed };
}

// Without it, tools answer from partial details as if they were complete
export const detailsWarning = ({ failed }: { failed: number }) =>
  failed ? `Steam didn't return details for ${failed} games, so these results may be incomplete.` : undefined;

export function storeFacts(appid: number) {
  const entry = cachedDetails(appid);
  const price = entry?.data.price_overview;
  const reviews = entry?.reviews;
  return {
    price: entry?.data.is_free ? "Free" : price?.final_formatted,
    discountPercent: price?.discount_percent || undefined,
    reviews: reviews?.count
      ? `${reviews.label} (${reviews.positivePercent}% of ${reviews.count.toLocaleString("en-US")})`
      : undefined,
  };
}
