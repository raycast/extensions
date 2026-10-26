import { APIOpt, IGif, IGifAPI, slugify } from "./gif";
import { fetchProviderJson, ProviderRequestError } from "../lib/fetchProviderJson";
import { getKlipyApiKey } from "../preferences";

export type KlipyContentType = "stickers" | "clips" | "memes";

const API_BASE_URL = "https://api.klipy.com/api/v1";
const SEGMENTS: Record<KlipyContentType, string> = { stickers: "stickers", clips: "clips", memes: "static-memes" };
const PROVIDER_NAMES: Record<KlipyContentType, string> = {
  stickers: "Klipy Stickers",
  clips: "Klipy Clips",
  memes: "Klipy Memes",
};
// Klipy asks for a stable per-user id, so every install shares one to stay anonymous.
const CUSTOMER_ID = "raycast-gif-search";

type KlipyFormat = "gif" | "webp" | "png" | "jpg";
type KlipyMediaFile = { url: string; width?: number; height?: number; size?: number };
type KlipySize = "hd" | "md" | "sm" | "xs";

export type KlipyMediaItem = {
  id?: number;
  slug: string;
  title: string;
  file: Partial<Record<KlipySize, Partial<Record<KlipyFormat, KlipyMediaFile>>>>;
  tags?: string[];
  type: string;
};

export type KlipyClipItem = {
  url?: string;
  slug: string;
  title: string;
  file: { mp4?: string; gif?: string; webp?: string };
  file_meta?: Partial<Record<"mp4" | "gif" | "webp", { width: number; height: number }>>;
  tags?: string[];
  type: string;
};

type KlipyItem = KlipyMediaItem | KlipyClipItem | { type: "ad" };

type KlipyPage = {
  result: boolean;
  data?: { data?: KlipyItem[]; current_page?: number; has_next?: boolean };
};

// Grid previews need a format macOS renders natively, so webp is the last resort.
const FORMATS: Record<Exclude<KlipyContentType, "clips">, KlipyFormat[]> = {
  stickers: ["gif", "png", "webp"],
  memes: ["png", "jpg", "gif", "webp"],
};

function getKlipyUrl(type: KlipyContentType, path: string) {
  const apiKey = getKlipyApiKey();
  if (!apiKey) {
    throw new ProviderRequestError(`Add a Klipy API key in the extension preferences to use ${PROVIDER_NAMES[type]}.`);
  }

  return new URL(`${API_BASE_URL}/${encodeURIComponent(apiKey)}/${SEGMENTS[type]}/${path}`);
}

function getListUrl(type: KlipyContentType, path: "search" | "trending", opt?: APIOpt) {
  const reqUrl = getKlipyUrl(type, path);
  const page = Number(opt?.next) || 1;
  const perPage = Math.min(Math.max(opt?.limit ?? 24, 8), 50);

  reqUrl.searchParams.set("page", page.toString());
  reqUrl.searchParams.set("per_page", perPage.toString());
  reqUrl.searchParams.set("customer_id", CUSTOMER_ID);
  reqUrl.searchParams.set("content_filter", "low");
  return reqUrl;
}

function isContent(item: KlipyItem): item is KlipyMediaItem | KlipyClipItem {
  return item.type !== "ad" && "slug" in item && Boolean(item.slug);
}

export function mapKlipyPage(type: KlipyContentType, page: KlipyPage) {
  const items = page.data?.data ?? [];
  const results = items.filter(isContent).map((item) => mapKlipyItem(type, item));
  const next = page.data?.has_next ? String((page.data.current_page ?? 1) + 1) : "";
  return { results: results.filter((gif): gif is IGif => gif !== null), next };
}

export function mapKlipyItem(type: KlipyContentType, item: KlipyMediaItem | KlipyClipItem): IGif | null {
  return type === "clips" ? mapClip(item as KlipyClipItem) : mapMedia(type, item as KlipyMediaItem);
}

function pickFile(item: KlipyMediaItem, sizes: KlipySize[], formats: KlipyFormat[]) {
  for (const size of sizes) {
    for (const format of formats) {
      const file = item.file?.[size]?.[format];
      if (file?.url) return { ...file, format };
    }
  }
  return null;
}

function mapMedia(type: Exclude<KlipyContentType, "clips">, item: KlipyMediaItem): IGif | null {
  const formats = FORMATS[type];
  const full = pickFile(item, ["hd", "md", "sm", "xs"], formats);
  if (!full) return null;

  const small = pickFile(item, ["sm", "xs", "md", "hd"], formats) ?? full;
  const large = pickFile(item, ["md", "sm", "hd"], formats) ?? full;
  const slug = slugify(item.title) || item.slug;

  return {
    id: item.slug,
    title: item.title,
    url: `https://klipy.com/${SEGMENTS[type]}/${item.slug}`,
    slug,
    download_url: full.url,
    download_name: `${slug}.${full.format}`,
    small_preview_gif_url: small.url,
    large_preview_gif_url: large.url,
    gif_url: full.url,
    metadata: { width: full.width, height: full.height, size: full.size, tags: item.tags },
    attribution: "klipy-logo-square-180.png",
  };
}

function mapClip(item: KlipyClipItem): IGif | null {
  const preview = item.file.gif ?? item.file.webp;
  const download = item.file.mp4 ?? preview;
  if (!preview || !download) return null;

  const slug = slugify(item.title) || item.slug;
  const isMP4 = download === item.file.mp4;
  const dims = item.file_meta?.mp4 ?? item.file_meta?.gif;

  return {
    id: item.slug,
    title: item.title,
    url: `https://klipy.com/clips/${item.slug}`,
    slug,
    download_url: download,
    download_name: `${slug}.${isMP4 ? "mp4" : "gif"}`,
    small_preview_gif_url: preview,
    large_preview_gif_url: preview,
    gif_url: preview,
    metadata: { width: dims?.width, height: dims?.height, tags: item.tags },
    attribution: "klipy-logo-square-180.png",
  };
}

export default function klipyContent(type: KlipyContentType) {
  const provider = PROVIDER_NAMES[type];

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const reqUrl = getListUrl(type, "search", opt);
      reqUrl.searchParams.set("q", term);
      return mapKlipyPage(type, await fetchProviderJson<KlipyPage>(reqUrl, { provider, request: "search" }));
    },

    async trending(opt?: APIOpt) {
      const reqUrl = getListUrl(type, "trending", opt);
      return mapKlipyPage(type, await fetchProviderJson<KlipyPage>(reqUrl, { provider, request: "trending" }));
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const reqUrl = getKlipyUrl(type, "items");
      reqUrl.searchParams.set("slugs", ids.join(","));
      const page = await fetchProviderJson<KlipyPage>(reqUrl, { provider, request: "lookup" });
      return mapKlipyPage(type, page).results;
    },
  };
}
