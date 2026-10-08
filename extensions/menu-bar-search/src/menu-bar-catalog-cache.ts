import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import { MenuBarItem } from "./menu-bar-types";

const CATALOG_CACHE_VERSION = 1;
const FRESH_CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "menu-bar-catalog" });

type CachedCatalog = {
  version: number;
  writtenAt: number;
  helperPath: string;
  items: MenuBarItem[];
};

export function readCachedMenuBarCatalog(helperPath: string, now = Date.now()) {
  const catalog = readRawCachedCatalog(helperPath);
  if (!catalog) return undefined;
  if (now - catalog.writtenAt > FRESH_CACHE_TTL_MS) return undefined;
  return catalog.items;
}

export function readStaleMenuBarCatalog(helperPath: string, now = Date.now()) {
  const catalog = readRawCachedCatalog(helperPath);
  if (!catalog) return undefined;
  if (now - catalog.writtenAt > STALE_CACHE_TTL_MS) return undefined;
  return catalog.items;
}

export function writeCachedMenuBarCatalog(
  helperPath: string,
  items: MenuBarItem[],
  now = Date.now(),
) {
  if (items.length === 0) {
    cache.remove(cacheKey(helperPath));
    return;
  }

  const payload: CachedCatalog = {
    version: CATALOG_CACHE_VERSION,
    writtenAt: now,
    helperPath,
    items,
  };
  cache.set(cacheKey(helperPath), JSON.stringify(payload));
}

export function clearCachedMenuBarCatalog(helperPath: string) {
  cache.remove(cacheKey(helperPath));
}

function readRawCachedCatalog(helperPath: string) {
  const raw = cache.get(cacheKey(helperPath));
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCachedCatalog(parsed, helperPath)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function isCachedCatalog(
  value: unknown,
  helperPath: string,
): value is CachedCatalog {
  if (typeof value !== "object" || value === null) return false;
  const catalog = value as Partial<CachedCatalog>;

  return (
    catalog.version === CATALOG_CACHE_VERSION &&
    catalog.helperPath === helperPath &&
    Number.isFinite(catalog.writtenAt) &&
    Array.isArray(catalog.items) &&
    catalog.items.length > 0 &&
    catalog.items.every(isMenuBarItem)
  );
}

function isMenuBarItem(value: unknown): value is MenuBarItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<MenuBarItem>;

  return (
    typeof item.id === "string" &&
    typeof item.ownerPid === "number" &&
    Array.isArray(item.actions) &&
    typeof item.source === "string"
  );
}

function cacheKey(helperPath: string) {
  const digest = createHash("sha256")
    .update(helperPath)
    .digest("hex")
    .slice(0, 16);
  return `catalog:v${CATALOG_CACHE_VERSION}:${digest}`;
}
