// Yab's own files, read in place and never written. Everything lives in
// ~/Library/Application Support/Yab (Yab Dev for the dev build); a file that
// is missing or unreadable reads as empty. docs/raycast.md, "Reading the files".

import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const run = promisify(execFile);

/** Swift's default Date: seconds since 2001-01-01. */
const APPLE_EPOCH = 978307200;

/** Yab's bundle id. YAB_BUNDLE points the extension at a dev build, for evals/raycast; Raycast never sets it. */
export function bundleID(): string {
  return process.env.YAB_BUNDLE || "dev.serafim.fast";
}

export function dataDir(): string {
  const folder = bundleID() === "dev.serafim.fast.dev" ? "Yab Dev" : "Yab";
  return join(homedir(), "Library", "Application Support", folder);
}

export function file(name: string): string {
  return join(dataDir(), name);
}

function readJSON<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function appleDate(seconds: number | undefined): Date | undefined {
  return seconds === undefined ? undefined : new Date((seconds + APPLE_EPOCH) * 1000);
}

// MARK: - spaces

export type SpaceInfo = {
  id: string;
  name: string;
  icon: string;
  color?: string;
  search?: string;
  searchCustom?: string;
};

type SpaceRecord = {
  id: string;
  name: string;
  icon: string;
  paint?: { color?: string };
  search?: string;
  searchCustom?: string;
};

export function spaceInfos(): SpaceInfo[] {
  return readJSON<SpaceRecord[]>("spaces.json", []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.paint?.color,
    search: s.search,
    searchCustom: s.searchCustom,
  }));
}

/** An SF Symbol name ("folder.fill") rather than an emoji. */
export function isSymbol(icon: string): boolean {
  return /^[a-z0-9.]+$/.test(icon);
}

// MARK: - search engines (Sources/Fast/Engine.swift)

const ENGINES: Record<string, string> = {
  google: "https://www.google.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  ecosia: "https://www.ecosia.org/search?q=%s",
  startpage: "https://www.startpage.com/sp/search?query=%s",
  kagi: "https://kagi.com/search?q=%s",
  brave: "https://search.brave.com/search?q=%s",
  qwant: "https://www.qwant.com/?q=%s",
};

let defaultEngine: string | undefined;

async function standardEngine(): Promise<string> {
  if (defaultEngine !== undefined) return defaultEngine;
  try {
    const { stdout } = await run("/usr/bin/defaults", ["read", bundleID(), "search.engine"]);
    defaultEngine = stdout.trim();
  } catch {
    defaultEngine = "google";
  }
  return defaultEngine;
}

/** The results page for words, with the engine the space searches with. */
export async function searchURL(words: string, spaceID?: string): Promise<string> {
  const space = spaceInfos().find((s) => s.id === spaceID);
  let page = ENGINES[space?.search ?? ""];
  if (space?.search === "custom" && space.searchCustom?.includes("%s")) page = space.searchCustom;
  page ??= ENGINES[await standardEngine()] ?? ENGINES.google;
  return page.replace("%s", encodeURIComponent(words));
}

/** Whether typed text is an address rather than words, as Yab's field decides (Address.swift). */
export function looksLikeAddress(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;
  if (/^(about|data):/i.test(t)) return true;
  const head = t.split(/[/?#]/)[0];
  if (head.includes("@")) return false;
  if (/^localhost(:\d+)?$/i.test(head)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(head)) return true;
  return /^[^.\s]+(\.[^.\s]+)*\.[a-z]{2,}(:\d+)?$/i.test(head);
}

export function addressURL(text: string): string {
  const t = text.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}

/** An address as is, words as a search: what Yab's field does with them. */
export async function resolve(text: string, spaceID?: string): Promise<string> {
  return looksLikeAddress(text) ? addressURL(text) : searchURL(text, spaceID);
}

// MARK: - favicons and page pictures

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function domainOf(url: string): string {
  return hostOf(url).replace(/^www\./, "");
}

/** Yab's own icon for a page, as its sidebar shows it, if it has one. */
export function faviconFile(url: string): string | undefined {
  const host = hostOf(url);
  if (!host) return undefined;
  const bare = host.replace(/^www\./, "");
  for (const name of [host, bare, `www.${bare}`]) {
    const path = file(join("icons", `${name}.png`));
    if (existsSync(path)) return path;
  }
  return undefined;
}

/** FNV-1a of the page's key, as Diary.shot names its picture. */
function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(text, "utf8")) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16);
}

export function pictureFile(key: string): string | undefined {
  const name = fnv1a64(key);
  for (const path of [file(join("shots", `${name}.jpg`)), file(join("shots", `${name}.og.jpg`))]) {
    if (existsSync(path)) return path;
  }
  return undefined;
}

// MARK: - history (diary.sqlite, Sources/Fast/Diary.swift)

export type HistoryPage = {
  key: string;
  url: string;
  title: string;
  host: string;
  count: number;
  /** Unix seconds. */
  last: number;
  /** A passage of the page's text around the words, marked with ⟦ … ⟧. */
  passage?: string;
  /** The match was in the page's text, not its title or address. */
  inPage: boolean;
  space?: string;
  thread?: string;
};

type HistoryRow = Omit<HistoryPage, "inPage" | "passage"> & { inPage: number; passage: string | null };

export type HistoryFilter = { since?: number; until?: number; space?: string; host?: string; limit?: number };

function quote(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

/** Words as an FTS5 query: every word, each as a prefix. */
function ftsQuery(text: string): string | undefined {
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/"/g, ""))
    .filter((w) => w.length > 0);
  return words.length ? words.map((w) => `"${w}"*`).join(" ") : undefined;
}

export async function sqlite<T>(name: string, sql: string): Promise<T[]> {
  const path = file(name);
  if (!existsSync(path)) return [];
  // In place, read-only: a copy without its -wal file misses the newest pages.
  const { stdout } = await run("/usr/bin/sqlite3", ["-readonly", "-json", "-cmd", ".timeout 2000", path, sql], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout.trim() ? (JSON.parse(stdout) as T[]) : [];
}

export async function searchHistory(text: string, filter: HistoryFilter = {}): Promise<HistoryPage[]> {
  const limit = filter.limit ?? 120;
  const where = [`EXISTS (SELECT 1 FROM visits v WHERE v.key = p.key AND v.quiet = 0)`];
  if (filter.since) where.push(`p.last >= ${Math.floor(filter.since)}`);
  if (filter.until) where.push(`p.last < ${Math.floor(filter.until)}`);
  if (filter.host) where.push(`p.host = ${quote(filter.host)}`);
  if (filter.space)
    where.push(`EXISTS (SELECT 1 FROM visits v WHERE v.key = p.key AND v.space = ${quote(filter.space)})`);
  const extra = `
    (SELECT v.space FROM visits v WHERE v.key = p.key ORDER BY v.at DESC LIMIT 1) AS space,
    (SELECT t.name FROM visits v JOIN threads t ON t.id = v.thread WHERE v.key = p.key AND t.name <> '' ORDER BY v.at DESC LIMIT 1) AS thread`;
  const query = ftsQuery(text);
  let sql: string;
  if (!query) {
    sql = `SELECT p.key, p.url, p.title, p.host, p.count, p.last, 0 AS inPage, NULL AS passage, ${extra}
      FROM pages p WHERE ${where.join(" AND ")} ORDER BY p.last DESC LIMIT ${limit};`;
  } else {
    sql = `WITH m AS (
        SELECT key, kind, snippet(words, 3, '⟦', '⟧', '…', 16) AS passage, bm25(words) AS score
        FROM words WHERE words MATCH ${quote(query)} LIMIT 2000
      ),
      best AS (SELECT key, min(kind) AS kind, min(score) AS score FROM m GROUP BY key)
      SELECT p.key, p.url, p.title, p.host, p.count, p.last, (best.kind = 1) AS inPage,
        (SELECT passage FROM m WHERE m.key = p.key AND m.kind = 1 ORDER BY score LIMIT 1) AS passage, ${extra}
      FROM best JOIN pages p ON p.key = best.key
      WHERE ${where.join(" AND ")}
      ORDER BY best.kind, p.last DESC LIMIT ${limit};`;
  }
  try {
    const rows = await sqlite<HistoryRow>("diary.sqlite", sql);
    return rows.map((r) => ({ ...r, inPage: Boolean(r.inPage), passage: r.passage || undefined }));
  } catch (error) {
    // An FTS query the words can't make, or a schema of another version.
    if (query) return searchHistoryPlain(text, filter);
    throw error;
  }
}

async function searchHistoryPlain(text: string, filter: HistoryFilter): Promise<HistoryPage[]> {
  const like = text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const q = quote(`%${w.replace(/[%_\\]/g, "\\$&")}%`);
      return `(p.title LIKE ${q} ESCAPE '\\' OR p.url LIKE ${q} ESCAPE '\\')`;
    });
  const where = [...like];
  if (filter.since) where.push(`p.last >= ${Math.floor(filter.since)}`);
  const rows = await sqlite<HistoryRow>(
    "diary.sqlite",
    `SELECT p.key, p.url, p.title, p.host, p.count, p.last, 0 AS inPage FROM pages p
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.last DESC LIMIT ${filter.limit ?? 120};`,
  );
  return rows.map((r) => ({ ...r, inPage: false, passage: undefined }));
}

// MARK: - bookmarks

export type Bookmark = { id: string; title: string; url: string; path: string[]; added?: Date };

type BookmarkNode = { id: string; title: string; url?: string; children?: BookmarkNode[]; added?: number };

export function bookmarks(): Bookmark[] {
  const out: Bookmark[] = [];
  const walk = (nodes: BookmarkNode[], path: string[]) => {
    for (const node of nodes) {
      if (node.url)
        out.push({ id: node.id, title: node.title || node.url, url: node.url, path, added: appleDate(node.added) });
      if (node.children) walk(node.children, [...path, node.title]);
    }
  };
  walk(readJSON<BookmarkNode[]>("bookmarks.json", []), []);
  return out;
}

// MARK: - downloads and files given to sites (Loot.swift, docs/files.md)

export type Download = {
  name: string;
  path: string;
  from: string;
  date?: Date;
  page?: string;
  pageTitle?: string;
  exists: boolean;
};

type DownloadRecord = { name: string; path: string; from: string; date?: number; page?: string; pageTitle?: string };

export function downloads(): Download[] {
  return readJSON<DownloadRecord[]>("downloads.json", [])
    .map((d) => ({ ...d, date: appleDate(d.date), exists: existsSync(d.path) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

export type SentFile = { name: string; host: string; path: string; date?: Date; exists: boolean };

export function sentFiles(): SentFile[] {
  return readJSON<{ name: string; host: string; path: string; date?: number }[]>("files-sent.json", [])
    .map((f) => ({ ...f, date: appleDate(f.date), exists: existsSync(f.path) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

// MARK: - snippets (MailSnippets.swift)

export type Snippet = {
  id: string;
  name: string;
  body: string;
  subject?: string;
  uses?: number;
  used?: number;
  mailOnly?: boolean;
};

export function snippets(): Snippet[] {
  const list = readJSON<Snippet[] | { snippets?: Snippet[] }>(join("mail", "snippets.noindex", "snippets.json"), []);
  const items = Array.isArray(list) ? list : (list.snippets ?? []);
  return items.sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));
}

/** `{{place}}` names a snippet asks for before it pastes. */
export function snippetPlaces(body: string): string[] {
  const names = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    if (!["clipboard", "date", "cursor"].includes(m[1])) names.add(m[1]);
  }
  return [...names];
}
