import { Cache, environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { readFile, stat, utimes } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";
import { CACHE_SCHEMA, DOCS_BASE } from "./constants";
import { fetchIfChanged, fetchText } from "./http";
import { writeFileAtomic } from "./storage";
import { Validators } from "./types";

const PAGE_TTL = 24 * 60 * 60 * 1000;
const MEMORY_PAGE_LIMIT = 2;
const EXPIRY_MARKER = ".expired";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const detailsCache = new Cache({
  namespace: `details-${CACHE_SCHEMA}`,
  capacity: 10 * 1024 * 1024,
});

const memoryPages = new Map<string, string>();

function rememberPage(key: string, html: string): void {
  memoryPages.delete(key);
  memoryPages.set(key, html);
  while (memoryPages.size > MEMORY_PAGE_LIMIT) {
    const oldest = memoryPages.keys().next().value;
    if (oldest === undefined) break;
    memoryPages.delete(oldest);
  }
}

function keep(key: string, html: string, remember: boolean): string {
  if (remember) rememberPage(key, html);
  return html;
}

function pagesDirectory(): string {
  return path.join(environment.supportPath, "pages", CACHE_SCHEMA);
}

function pageFile(key: string): string {
  return path.join(
    pagesDirectory(),
    `${createHash("sha1").update(key).digest("hex")}.gz`,
  );
}

function markerFile(): string {
  return path.join(pagesDirectory(), EXPIRY_MARKER);
}

interface StoredPage {
  compressed: Buffer;
  validators: Validators;
  checkedAt: number;
}

// One line of JSON validators, then the gzipped HTML: Guild.html goes from
// 987 KB to 61 KB on disk. The file's mtime records the last confirmation.
async function readStoredPage(key: string): Promise<StoredPage | null> {
  try {
    const file = pageFile(key);
    const [info, content] = await Promise.all([stat(file), readFile(file)]);
    const newline = content.indexOf(0x0a);
    if (newline === -1) return null;
    return {
      compressed: content.subarray(newline + 1),
      validators: JSON.parse(
        content.subarray(0, newline).toString("utf8"),
      ) as Validators,
      checkedAt: info.mtimeMs,
    };
  } catch {
    return null;
  }
}

// Inflated only once it is known to be needed: sixteen scan workers waiting on
// a 304 would otherwise each hold a megabyte of markup they may never use.
async function inflate(stored: StoredPage | null): Promise<string | null> {
  if (!stored) return null;
  try {
    return (await gunzipAsync(stored.compressed)).toString("utf8");
  } catch {
    return null;
  }
}

async function storePage(
  key: string,
  html: string,
  validators: Validators,
): Promise<void> {
  try {
    const header = Buffer.from(`${JSON.stringify(validators)}\n`, "utf8");
    await writeFileAtomic(
      pageFile(key),
      Buffer.concat([header, await gzipAsync(html)]),
    );
  } catch {
    // A failed disk write only costs us the offline copy, never the lookup itself.
  }
}

async function touchPage(key: string): Promise<void> {
  const now = new Date();
  await utimes(pageFile(key), now, now).catch(() => undefined);
}

async function freshSince(): Promise<number> {
  const expired = await stat(markerFile()).then(
    (info) => info.mtimeMs,
    () => 0,
  );
  return Math.max(Date.now() - PAGE_TTL, expired);
}

export async function fetchPage(
  page: string,
  base = DOCS_BASE,
  force = false,
  remember = true,
): Promise<string> {
  const key = base + page;
  const remembered = memoryPages.get(key);
  if (remembered && !force) return remembered;

  let stored = await readStoredPage(key);
  if (stored && !force && stored.checkedAt > (await freshSince())) {
    const html = await inflate(stored);
    if (html !== null) return keep(key, html, remember);
    stored = null;
  }

  try {
    const fresh = await fetchIfChanged(key, stored?.validators);
    if (fresh) {
      await storePage(key, fresh.body, fresh.validators);
      return keep(key, fresh.body, remember);
    }

    const current = await inflate(stored);
    if (current !== null) {
      await touchPage(key);
      return keep(key, current, remember);
    }

    const repaired = await fetchText(key);
    await storePage(key, repaired.body, repaired.validators);
    return keep(key, repaired.body, remember);
  } catch (error) {
    const stale = await inflate(stored);
    if (stale === null) throw error;
    return keep(key, stale, remember);
  }
}

// Expiring instead of deleting keeps every page readable offline, while the
// next lookup of each one still asks the server whether it changed.
export async function expirePages(): Promise<void> {
  memoryPages.clear();
  await writeFileAtomic(markerFile(), String(Date.now()));
}

export async function clearDetailsCache(): Promise<void> {
  detailsCache.clear();
  await expirePages();
}
