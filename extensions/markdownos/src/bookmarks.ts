import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { withBookmarksLock } from "./bookmarks-lock";
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

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** The file's contents as they are right now, plus the raw text (null when there's no file yet).
 *
 *  Empty is only the right answer for "this vault has never saved a bookmark" (no file yet).
 *  Anything else (a permission error, a half-written file, disk trouble) has to be a real failure:
 *  every write here puts the WHOLE file back, so treating a transient read failure as "empty" would
 *  have the next save replace every existing bookmark with just the one being changed. And a
 *  missing file is only trusted as "never saved" when nothing says otherwise: MarkdownOS keeps the
 *  previous version alongside as `.bak`, and iCloud leaves a `.<name>.icloud` placeholder for a file
 *  it hasn't downloaded, so either one means the bookmarks exist and just can't be read right now. */
async function readBookmarksFile(vaultPath: string): Promise<{ data: BookmarksFile; raw: string | null }> {
  const file = bookmarksFilePath(vaultPath);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const placeholder = path.join(path.dirname(file), `.${path.basename(file)}.icloud`);
    if (await exists(placeholder)) {
      throw new Error("Your bookmarks are still downloading from iCloud. Nothing was changed. Try again shortly.");
    }
    if (await exists(`${file}.bak`)) {
      throw new Error(
        "Your bookmarks file is missing (a backup is still there). Nothing was changed. Open MarkdownOS to check your bookmarks.",
      );
    }
    return { data: { bookmarks: [], tags: [], pinnedTagIds: [] }, raw: null };
  }
  const parsed = JSON.parse(raw) as Partial<BookmarksFile>;
  return {
    data: {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      pinnedTagIds: Array.isArray(parsed.pinnedTagIds) ? parsed.pinnedTagIds : [],
    },
    raw,
  };
}

/** Only ever called while holding the lock (see mutateBookmarks). A temp name unique to this write,
 *  not just to this process: every Raycast command shares one pid, so a pid-only name let two
 *  concurrent writes share a temp file. The previous contents are kept as `.bak`, as MarkdownOS does. */
async function writeBookmarksFile(vaultPath: string, json: string, previousRaw: string | null): Promise<void> {
  const file = bookmarksFilePath(vaultPath);
  if (previousRaw !== null) await fs.writeFile(`${file}.bak`, previousRaw).catch(() => {});
  const temp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await fs.writeFile(temp, json);
    await fs.rename(temp, file);
  } catch (error) {
    await fs.unlink(temp).catch(() => {});
    throw error;
  }
}

/**
 * Every change to bookmarks.json goes through here: take the lock, read the file as it is NOW,
 * apply the change to that, write it back, release. Two overlapping actions — two Raycast commands,
 * or a command and MarkdownOS — can no longer start from the same snapshot and have the second
 * write erase the first. `change` must not do network work; anything slow happens before this.
 * Nothing is written if the change turns out to change nothing.
 */
async function mutateBookmarks<T>(vaultPath: string, change: (data: BookmarksFile) => T | Promise<T>): Promise<T> {
  return withBookmarksLock(bookmarksDir(vaultPath), async () => {
    const { data, raw } = await readBookmarksFile(vaultPath);
    const before = JSON.stringify(data, null, 2);
    const result = await change(data);
    const after = JSON.stringify(data, null, 2);
    if (after !== before) await writeBookmarksFile(vaultPath, after, raw);
    return result;
  });
}

export async function loadBookmarks(vaultPath: string): Promise<{ bookmarks: Bookmark[]; tags: BookmarkTag[] }> {
  const { bookmarks, tags } = (await readBookmarksFile(vaultPath)).data;
  return { bookmarks, tags };
}

export async function updateBookmark(
  vaultPath: string,
  id: string,
  patch: { title?: string; searchTerms?: string },
): Promise<void> {
  await mutateBookmarks(vaultPath, (data) => {
    const existing = data.bookmarks.find((b) => b.id === id);
    if (!existing) return;
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      existing.title = trimmed || existing.fetchedTitle || hostnameFallback(existing.url);
      existing.titleIsCustom = trimmed.length > 0;
    }
    if (patch.searchTerms !== undefined) existing.searchTerms = patch.searchTerms.trim();
    existing.updatedAt = new Date().toISOString();
  });
}

export async function setBookmarkArchived(vaultPath: string, id: string, archived: boolean): Promise<void> {
  await mutateBookmarks(vaultPath, (data) => {
    const existing = data.bookmarks.find((b) => b.id === id);
    if (!existing) return;
    existing.archivedAt = archived ? (existing.archivedAt ?? new Date().toISOString()) : null;
  });
}

export async function setBookmarkTag(vaultPath: string, id: string, tagId: string, checked: boolean): Promise<void> {
  await mutateBookmarks(vaultPath, (data) => {
    const existing = data.bookmarks.find((b) => b.id === id);
    if (!existing) return;
    if (checked) {
      // A tag deleted in MarkdownOS after this list was loaded would otherwise be written onto the
      // bookmark as an id that names nothing — the same check the app's own bookmarks:addTag makes.
      if (existing.tagIds.includes(tagId) || !data.tags.some((t) => t.id === tagId)) return;
      existing.tagIds = [...existing.tagIds, tagId];
    } else {
      existing.tagIds = existing.tagIds.filter((t) => t !== tagId);
    }
  });
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

  // A quick check before the slow fetches below, so an obvious duplicate answers at once. Not the
  // final word — see the re-check under the lock at the end.
  const target = normalizeUrlForCompare(url);
  const findDuplicate = (data: BookmarksFile) => data.bookmarks.find((b) => normalizeUrlForCompare(b.url) === target);
  const early = findDuplicate((await readBookmarksFile(vaultPath)).data);
  if (early) return { status: "duplicate", existing: early };

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

  // Inserted into the file as it is NOW, under the lock — the fetches above can take several
  // seconds, and anything saved elsewhere meanwhile has to survive. The duplicate check runs again
  // here too, against that same latest state: the same url may have been saved in the meantime.
  const result = await mutateBookmarks(vaultPath, (latest): AddBookmarkResult => {
    const duplicate = findDuplicate(latest);
    if (duplicate) return { status: "duplicate", existing: duplicate };
    latest.bookmarks = [bookmark, ...latest.bookmarks];
    return { status: "created", bookmark };
  });
  // Named after this bookmark's own fresh id, so nothing else can be using it.
  if (result.status === "duplicate" && faviconFile) {
    await fs.unlink(path.join(bookmarksDir(vaultPath), "favicons", faviconFile)).catch(() => {});
  }
  return result;
}

/** A favicon file only this bookmark can be using: one named after its own id, which is how this
 *  extension (and older MarkdownOS versions) name the files they create. MarkdownOS now names
 *  icons by their content (`fav-<hash>.<ext>`) and shares one file between every bookmark with the
 *  same icon, so deleting one of those here could blank the icon of every other bookmark using it
 *  — and whether the app is about to reference it can't be known from outside. Those are left for
 *  MarkdownOS to manage. */
function ownsFaviconFile(bookmark: Bookmark): boolean {
  const file = bookmark.faviconFile;
  return !!file && (file.startsWith(`${bookmark.id}.`) || file.startsWith(`${bookmark.id}-`));
}

export async function deleteBookmark(vaultPath: string, id: string): Promise<void> {
  const orphanedIcon = await mutateBookmarks(vaultPath, (data) => {
    const existing = data.bookmarks.find((b) => b.id === id);
    if (!existing) return null;
    data.bookmarks = data.bookmarks.filter((b) => b.id !== id);
    const file = existing.faviconFile;
    return file && ownsFaviconFile(existing) && !data.bookmarks.some((b) => b.faviconFile === file) ? file : null;
  });
  // Only once the deletion is saved — a save that failed must not leave the bookmark pointing at an
  // icon that's already gone. Safe outside the lock: nothing else can reference a file it owns.
  if (orphanedIcon) {
    await fs.unlink(path.join(bookmarksDir(vaultPath), "favicons", orphanedIcon)).catch(() => {});
  }
}
