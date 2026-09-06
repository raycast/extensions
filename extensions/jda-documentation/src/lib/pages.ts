import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA, DOCS_BASE, timeoutSignal } from "./constants";

const PAGE_TTL = 24 * 60 * 60 * 1000;
const MEMORY_PAGE_LIMIT = 2;

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

function pagesDirectory(): string {
  return path.join(environment.supportPath, "pages", CACHE_SCHEMA);
}

function pageFile(key: string): string {
  return path.join(
    pagesDirectory(),
    createHash("sha1").update(key).digest("hex"),
  );
}

async function readStoredPage(
  key: string,
  allowStale: boolean,
): Promise<string | null> {
  try {
    const file = pageFile(key);
    const info = await stat(file);
    if (!allowStale && Date.now() - info.mtimeMs > PAGE_TTL) return null;
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function storePage(key: string, html: string): Promise<void> {
  try {
    await mkdir(pagesDirectory(), { recursive: true });
    await writeFile(pageFile(key), html, "utf8");
  } catch {
    // A failed disk write only costs us the offline copy, never the lookup itself.
  }
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

  if (!force) {
    const stored = await readStoredPage(key, false);
    if (stored) {
      rememberPage(key, stored);
      return stored;
    }
  }

  try {
    const response = await fetch(key, { signal: timeoutSignal() });
    if (!response.ok)
      throw new Error(`Failed to load ${page} (HTTP ${response.status})`);
    const html = await response.text();
    if (remember) rememberPage(key, html);
    await storePage(key, html);
    return html;
  } catch (error) {
    const stale = await readStoredPage(key, true);
    if (stale) {
      rememberPage(key, stale);
      return stale;
    }
    throw error;
  }
}

export async function discardPages(): Promise<void> {
  forgetPages();
  await rm(pagesDirectory(), { recursive: true, force: true });
}

export function forgetPages(): void {
  memoryPages.clear();
}
