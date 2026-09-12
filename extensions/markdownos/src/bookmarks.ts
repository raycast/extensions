import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { VAULT_MARKER_DIR } from "./vault";

export interface BookmarkTag {
  id: string;
  name: string;
  icon: string | null;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  titleIsCustom: boolean;
  fetchedTitle: string;
  description: string;
  searchTerms: string;
  faviconFile: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  enriching: boolean;
}

interface BookmarksFile {
  bookmarks: Bookmark[];
  tags: BookmarkTag[];
  pinnedTagIds: string[];
}

function bookmarksDir(vaultPath: string): string {
  return path.join(vaultPath, VAULT_MARKER_DIR, "bookmarks");
}

function bookmarksFilePath(vaultPath: string): string {
  return path.join(bookmarksDir(vaultPath), "bookmarks.json");
}

function hostnameFallback(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Matches normalizeUrl in main/handlers/bookmarks.ts.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Matches normalizeUrlForCompare in main/handlers/bookmarks.ts — what the app itself uses to
// detect a duplicate before offering "Create bookmark", except the backend has no such check of
// its own, so this extension has to run the same comparison itself.
function normalizeUrlForCompare(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    // .host, not .hostname: the latter drops the port, so two different local dev servers
    // (localhost:3000 vs localhost:8080) would normalize identically and look like duplicates.
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${cleanPath}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Empty is only the right answer for "this vault has never saved a bookmark" (no file yet) — the
 *  one case ENOENT actually means. Anything else (a permission error, a half-written file from a
 *  crash mid-rename, disk trouble) has to be a real failure: every write in this module reads the
 *  file, modifies it in memory, and writes the WHOLE thing back, so treating a transient read
 *  failure as "empty" would have the next save silently replace every existing bookmark with just
 *  the one being added or changed. Letting it throw here means a caller either surfaces the error
 *  (an in-app command with a toast) or the mutation itself stops rather than clobbering real data. */
async function readBookmarksFile(vaultPath: string): Promise<BookmarksFile> {
  let raw: string;
  try {
    raw = await fs.readFile(bookmarksFilePath(vaultPath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { bookmarks: [], tags: [], pinnedTagIds: [] };
    throw error;
  }
  const parsed = JSON.parse(raw) as Partial<BookmarksFile>;
  return {
    bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    pinnedTagIds: Array.isArray(parsed.pinnedTagIds) ? parsed.pinnedTagIds : [],
  };
}

async function writeBookmarksFile(vaultPath: string, data: BookmarksFile): Promise<void> {
  const dir = bookmarksDir(vaultPath);
  await fs.mkdir(dir, { recursive: true });
  const file = bookmarksFilePath(vaultPath);
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2));
  await fs.rename(temp, file);
}

export async function loadBookmarks(vaultPath: string): Promise<{ bookmarks: Bookmark[]; tags: BookmarkTag[] }> {
  const { bookmarks, tags } = await readBookmarksFile(vaultPath);
  return { bookmarks, tags };
}

export async function updateBookmark(
  vaultPath: string,
  id: string,
  patch: { title?: string; searchTerms?: string },
): Promise<void> {
  const data = await readBookmarksFile(vaultPath);
  const existing = data.bookmarks.find((b) => b.id === id);
  if (!existing) return;
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    existing.title = trimmed || existing.fetchedTitle || hostnameFallback(existing.url);
    existing.titleIsCustom = trimmed.length > 0;
  }
  if (patch.searchTerms !== undefined) existing.searchTerms = patch.searchTerms.trim();
  existing.updatedAt = new Date().toISOString();
  await writeBookmarksFile(vaultPath, data);
}

export async function setBookmarkArchived(vaultPath: string, id: string, archived: boolean): Promise<void> {
  const data = await readBookmarksFile(vaultPath);
  const existing = data.bookmarks.find((b) => b.id === id);
  if (!existing) return;
  existing.archivedAt = archived ? (existing.archivedAt ?? new Date().toISOString()) : null;
  await writeBookmarksFile(vaultPath, data);
}

export async function setBookmarkTag(vaultPath: string, id: string, tagId: string, checked: boolean): Promise<void> {
  const data = await readBookmarksFile(vaultPath);
  const existing = data.bookmarks.find((b) => b.id === id);
  if (!existing) return;
  existing.tagIds = checked
    ? existing.tagIds.includes(tagId)
      ? existing.tagIds
      : [...existing.tagIds, tagId]
    : existing.tagIds.filter((t) => t !== tagId);
  await writeBookmarksFile(vaultPath, data);
}

// Same headers/caps as main/handlers/bookmarks.ts's own page fetch — an unknown User-Agent gets a
// flat 403 from some hosts (Medium, claude.ai), and a small head cap misses <title> entirely on
// pages that front-load huge inline scripts (YouTube's sits ~700KB in). See that file's own
// comments for the measurements behind these numbers.
const FETCH_TIMEOUT_MS = 8_000;
const HEAD_CHAR_CAP = 1_048_576;
const HEAD_READ_CAP = 2_048;
const PAGE_FETCH_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function decodeEntities(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

async function fetchPageTitle(url: string): Promise<string> {
  if (!/^https?:/i.test(url)) return "";
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: PAGE_FETCH_HEADERS,
    });
    if (!response.ok || !response.body) return "";
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let html = "";
    let reads = 0;
    try {
      while (html.length < HEAD_CHAR_CAP && reads < HEAD_READ_CAP) {
        reads += 1;
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const og =
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    const plainTitle = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return decodeEntities(og?.[1] ?? plainTitle?.[1] ?? "").slice(0, 300);
  } catch {
    return "";
  }
}

const FAVICON_TIMEOUT_MS = 5_000;
const FAVICON_BYTE_CAP = 512 * 1024;

function extensionForContentType(contentType: string | null): string {
  if (!contentType) return "png";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("icon") || contentType.includes("ico")) return "ico";
  return "png";
}

// Raycast's own hosted favicon service (the same one getFavicon() uses for display elsewhere in
// this extension) rather than scraping the page's HTML for a <link rel="icon"> the way the app
// itself does — simpler, and reliable for the same reason the app's own PROVIDER favicon (tried
// before its HTML scrape) already is: it works even when the page sets its icon via JS or hides it
// behind a redirect. Still written to disk under the app's own naming convention
// (`<bookmarkId>.<ext>` in bookmarks/favicons/), so the app recognizes it as a normal cached
// favicon once it reloads — only the FETCH strategy is Raycast's, not the on-disk shape.
async function fetchAndCacheFavicon(vaultPath: string, bookmarkId: string, pageUrl: string): Promise<string | null> {
  let hostname: string;
  try {
    hostname = new URL(pageUrl).hostname;
  } catch {
    return null;
  }
  try {
    const providerUrl = `https://api.ray.so/favicon?url=${encodeURIComponent(hostname)}&size=64`;
    const response = await fetch(providerUrl, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS) });
    if (!response.ok || !response.body) return null;
    const contentType = response.headers.get("content-type");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (total < FAVICON_BYTE_CAP) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (total === 0) return null;
    const fileName = `${bookmarkId}.${extensionForContentType(contentType)}`;
    const dir = path.join(bookmarksDir(vaultPath), "favicons");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.concat(chunks, total));
    return fileName;
  } catch {
    return null;
  }
}

export type AddBookmarkResult =
  { status: "created"; bookmark: Bookmark } | { status: "invalid-url" } | { status: "duplicate"; existing: Bookmark };

/** Validates, dedupes, fetches the real title + a cached favicon, then saves — all before
 *  returning, unlike the app's own optimistic-row-then-background-enrich flow: a Raycast command's
 *  process doesn't stick around to deliver a later update the way an open Electron window does, so
 *  there's no "arrives instantly, fills in a moment later" here — the toast just stays up while
 *  this runs. Duplicate check covers archived bookmarks too, matching the app's own (renderer-only)
 *  isDuplicateUrl — the backend has no such check to lean on. */
export async function addBookmark(vaultPath: string, rawUrl: string, customTitle: string): Promise<AddBookmarkResult> {
  const url = normalizeUrl(rawUrl);
  try {
    new URL(url);
  } catch {
    return { status: "invalid-url" };
  }

  const data = await readBookmarksFile(vaultPath);
  const target = normalizeUrlForCompare(url);
  const existing = data.bookmarks.find((b) => normalizeUrlForCompare(b.url) === target);
  if (existing) return { status: "duplicate", existing };

  const id = randomUUID();
  const trimmedTitle = customTitle.trim();
  const fetchedTitle = await fetchPageTitle(url);
  const faviconFile = await fetchAndCacheFavicon(vaultPath, id, url);
  const now = new Date().toISOString();

  const bookmark: Bookmark = {
    id,
    url,
    title: trimmedTitle || fetchedTitle || hostnameFallback(url),
    titleIsCustom: trimmedTitle.length > 0,
    fetchedTitle,
    description: "",
    searchTerms: "",
    faviconFile,
    tagIds: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    enriching: false,
  };

  // Re-read right before writing rather than reusing `data` from above: the title and favicon
  // fetches in between can take several seconds, and writing back that stale snapshot would
  // silently discard any edit, archive, or delete made elsewhere while this was still in flight.
  // The dedupe check above is still against the early read — a duplicate created in that same
  // window is an acceptable race, but losing unrelated data to it is not.
  const latest = await readBookmarksFile(vaultPath);
  latest.bookmarks = [bookmark, ...latest.bookmarks];
  await writeBookmarksFile(vaultPath, latest);
  return { status: "created", bookmark };
}

export async function deleteBookmark(vaultPath: string, id: string): Promise<void> {
  const data = await readBookmarksFile(vaultPath);
  const existing = data.bookmarks.find((b) => b.id === id);
  if (!existing) return;
  data.bookmarks = data.bookmarks.filter((b) => b.id !== id);
  await writeBookmarksFile(vaultPath, data);
  if (existing.faviconFile) {
    await fs.unlink(path.join(bookmarksDir(vaultPath), "favicons", existing.faviconFile)).catch(() => {});
  }
}
