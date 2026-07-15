// Thin wrapper around the Research Sync backend (Cloudflare Worker).
// The Worker exposes a single POST /sync endpoint that merges the posted
// items (last-write-wins by url) and returns the full item set. Posting an
// empty array is therefore a safe read — it can't overwrite anything.

import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://readlater-sync.shearm.workers.dev";
const REQUEST_TIMEOUT_MS = 10000;
const OFFLINE_MESSAGE =
  "Couldn't reach the Research Sync service. Check your connection.";
const AUTH_MESSAGE =
  "Sync token rejected. Set or update it in this extension's settings (⌘,).";

export type OfflineStatus = "none" | "requested" | "saved" | "unavailable";

// Items are shared with the browser extension and the iOS app. This extension
// only authors the first six fields; the rest are owned by other clients or by
// the Worker itself. It must still round-trip them untouched — see revise().
export interface ReadLaterItem {
  url: string;
  title: string;
  savedAt: number;
  read: boolean;
  updatedAt: number;
  deleted: boolean;

  // Authored elsewhere. `notes` comes from the browser extension, `offline`
  // tracks the encrypted article body, `folder` is assigned by the Worker's
  // classifier some seconds after a save (so a fresh item has none yet).
  notes?: string;
  offline?: OfflineStatus;
  folder?: string;
}

// The Worker merges whole items last-write-wins, so any field absent from a
// write is erased for every other client. It restores `folder` if the winning
// revision lacks one, but `notes` and `offline` have no such guard — dropping
// them silently destroys data the browser and iOS apps rely on.
//
// Every write therefore goes through here: start from the item as the server
// sent it and layer changes on top, so unknown fields survive by construction
// rather than by luck. Never hand-build an item literal on a write path.
export function revise(
  item: ReadLaterItem,
  changes: Partial<ReadLaterItem>,
): ReadLaterItem {
  return { ...item, ...changes, updatedAt: Date.now() };
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

// Returns the item as created, so a caller can follow up on it (e.g. attach a
// captured body) without re-reading the whole list.
export async function saveItem(
  url: string,
  title: string,
): Promise<ReadLaterItem> {
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
  return newItem;
}

// Records what happened to a body capture. Kept separate from saveItem so the
// link is stored the instant we have it — capture is slower and may fail, and
// must never hold up or undo the save.
export async function setOffline(
  item: ReadLaterItem,
  offline: OfflineStatus,
): Promise<void> {
  await sync([revise(item, { offline })]);
}

// The caller already holds the full item (from the list), so we can update it
// in a single request — last-write-wins merge by url applies it server-side.
export async function setRead(
  item: ReadLaterItem,
  read: boolean,
): Promise<void> {
  await sync([revise(item, { read })]);
}

// Deletion is a tombstone, not a removal: other clients need the deleted item
// to stay in the list long enough to learn it went away. Dropping it outright
// would let their next sync resurrect it.
export async function setDeleted(item: ReadLaterItem): Promise<void> {
  await sync([revise(item, { deleted: true })]);
}

// Offline article bodies live outside the item list, under their own key, so a
// tombstone alone would strand the encrypted blob in KV forever. Best-effort:
// the tombstone is what matters, and the Worker tolerates a missing body.
export async function deleteBody(articleUrl: string): Promise<void> {
  const { syncToken } = getPreferenceValues<Preferences>();
  try {
    await fetch(`${BASE_URL}/body?url=${encodeURIComponent(articleUrl)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${syncToken}` },
    });
  } catch {
    // Ignored: GC failure must not fail the delete the user asked for.
  }
}

// The Worker represents "unsorted" as the absence of a folder, never as a
// stored value, and is explicitly told never to invent this name. It's a
// display label only — it must not be written back onto an item.
export const UNSORTED = "Unsorted";

// Groups items into folder sections, matching the browser extension's order:
// named folders alphabetically, "Unsorted" always last.
export function groupByFolder(
  items: ReadLaterItem[],
): { folder: string; items: ReadLaterItem[] }[] {
  const groups = new Map<string, ReadLaterItem[]>();
  for (const item of items) {
    const key = item.folder || UNSORTED;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const named = [...groups.keys()]
    .filter((f) => f !== UNSORTED)
    .sort((a, b) => a.localeCompare(b));
  if (groups.has(UNSORTED)) named.push(UNSORTED);

  return named.map((folder) => ({
    folder,
    items: groups.get(folder) as ReadLaterItem[],
  }));
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
