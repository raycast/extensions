// Thin wrapper around the Read Later sync backend (Cloudflare Worker).
// The Worker exposes a single POST /sync endpoint that merges the posted
// items (last-write-wins by url) and returns the full item set. Posting an
// empty array is therefore a safe read — it can't overwrite anything.

import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://readlater-sync.shearm.workers.dev";
const REQUEST_TIMEOUT_MS = 10000;
const OFFLINE_MESSAGE =
  "Couldn't reach the Read Later sync service. Check your connection.";
const AUTH_MESSAGE =
  "Sync token rejected. Set or update it in this extension's settings (⌘,).";

export interface ReadLaterItem {
  url: string;
  title: string;
  savedAt: number;
  read: boolean;
  updatedAt: number;
  deleted: boolean;
}

// POST the given items to the Worker and return the merged server set.
async function sync(items: ReadLaterItem[]): Promise<ReadLaterItem[]> {
  const { syncToken } = getPreferenceValues<Preferences>();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncToken}`,
      },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(AUTH_MESSAGE);
  }
  if (!response.ok) throw new Error(`Sync failed (HTTP ${response.status}).`);
  const data = (await response.json()) as { items?: ReadLaterItem[] };
  return data.items ?? [];
}

export async function getItems(): Promise<ReadLaterItem[]> {
  const items = await sync([]);
  return items.filter((i) => !i.deleted);
}

export async function saveItem(url: string, title: string): Promise<void> {
  const items = await getItems();
  if (items.some((i) => i.url === url)) {
    throw new Error("Already saved.");
  }
  const now = Date.now();
  const newItem: ReadLaterItem = {
    url,
    title: title || url,
    savedAt: now,
    read: false,
    updatedAt: now,
    deleted: false,
  };
  await sync([newItem]);
}

// The caller already holds the full item (from the list), so we can update it
// in a single request — last-write-wins merge by url applies it server-side.
export async function setRead(
  item: ReadLaterItem,
  read: boolean,
): Promise<void> {
  await sync([{ ...item, read, updatedAt: Date.now() }]);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// True if the given title is empty or just the URL's domain (e.g. the
// browser returned "nytimes.com" instead of the article title).
export function titleLooksLikeDomain(title: string, url: string): boolean {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (!t) return true;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  return t === host || t === url.toLowerCase();
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": "“",
  "&rdquo;": "”",
};

function decodeEntities(s: string): string {
  return s
    .replace(
      /&(?:amp|lt|gt|quot|apos|#39|nbsp|mdash|ndash|hellip|lsquo|rsquo|ldquo|rdquo);/g,
      (m) => HTML_ENTITIES[m] ?? m,
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

// Fetch the page and parse a clean title.
// Tries og:title first (more reliable for news sites with paywalls),
// then falls back to the <title> tag.
export async function fetchPageTitle(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      headers: {
        Range: "bytes=0-65535",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    if (!response.ok && response.status !== 206) return null;
    const html = await response.text();

    const og =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]*content="([^"]+)"/i,
      ) ??
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]*content='([^']+)'/i,
      ) ??
      html.match(
        /<meta[^>]+content="([^"]+)"[^>]+property=["']og:title["']/i,
      ) ??
      html.match(/<meta[^>]+content='([^']+)'[^>]+property=["']og:title["']/i);
    if (og?.[1]) return decodeEntities(og[1].trim());

    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t?.[1]) {
      return decodeEntities(t[1].replace(/\s+/g, " ").trim());
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function relativeDate(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
