import { Cache } from "@raycast/api";
import { buildLocaleUrl, DEFAULT_CACHE_TTL_MINUTES } from "./constants";
import type { Keybinding } from "./types";

type CacheEntry = { fetchedAt: number; data: Keybinding[] };

const memoryCache: Record<string, CacheEntry> = {};
const cacheStore = new Cache({ namespace: "lazygit-keybindings" });
const CACHE_PREFIX = "keybindings:";

export async function fetchKeybindings(
  locale: string,
  options?: { force?: boolean; useCache?: boolean; ttlMinutes?: number },
): Promise<Keybinding[]> {
  const preferCache = options?.useCache ?? true;
  const force = options?.force ?? false;
  const ttlMinutes = options?.ttlMinutes ?? DEFAULT_CACHE_TTL_MINUTES;
  const ttlMs = ttlMinutes * 60 * 1000;

  if (preferCache && !force) {
    const inMemory = getFromMemory(locale, ttlMs);
    if (inMemory) return inMemory.data;

    const fromDisk = getFromDisk(locale, ttlMs);
    if (fromDisk) {
      memoryCache[locale] = fromDisk;
      return fromDisk.data;
    }
  }

  const url = buildLocaleUrl(locale);
  const content = await downloadLocaleFile(url);
  const parsed = parseLocaleContent(content, locale);
  const payload: CacheEntry = { fetchedAt: Date.now(), data: parsed };

  memoryCache[locale] = payload;
  if (preferCache) {
    cacheStore.set(CACHE_PREFIX + locale, JSON.stringify(payload));
  }

  return parsed;
}

async function downloadLocaleFile(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "raycast-lazygit-keybindings",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch keybindings: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

function parseLocaleContent(content: string, locale: string): Keybinding[] {
  const lines = content.split(/\r?\n/);
  let currentCategory = "";
  const results: Keybinding[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      currentCategory = line.replace(/^##\s*/, "").trim();
      continue;
    }

    if (!line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2) continue;

    const [keyCell, actionCell, infoCell = ""] = cells;
    const headerRow =
      keyCell.toLowerCase() === "key" && actionCell.toLowerCase() === "action";
    const separatorRow = cells.every((cell) =>
      /^-+$/.test(cell.replace(/`/g, "").trim()),
    );
    if (headerRow || separatorRow) continue;

    const shortcut = cleanCellText(keyCell);
    const action = cleanCellText(actionCell);
    const info = cleanCellText(infoCell);

    if (!action || !shortcut) continue;

    results.push({
      action,
      shortcut,
      category: currentCategory || undefined,
      info: info || undefined,
      locale,
      path: buildLocaleUrl(locale),
    });
  }

  return results;
}

function cleanCellText(text: string): string {
  let value = text.trim();
  value = value.replace(/`+/g, "");
  value = value.replace(/<br\s*\/?>/gi, " • ");
  value = value.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  value = value.replace(/\s+/g, " ");
  return value.trim();
}

function getFromMemory(locale: string, ttlMs: number): CacheEntry | undefined {
  const cached = memoryCache[locale];
  if (!cached) return undefined;
  if (Date.now() - cached.fetchedAt > ttlMs) return undefined;
  return cached;
}

function getFromDisk(locale: string, ttlMs: number): CacheEntry | undefined {
  const raw = cacheStore.get(CACHE_PREFIX + locale);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.fetchedAt || !Array.isArray(parsed.data)) return undefined;
    if (Date.now() - parsed.fetchedAt > ttlMs) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function cacheTTLMinutesOrDefault(ttl?: string): number {
  const parsed = ttl ? parseInt(ttl, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CACHE_TTL_MINUTES;
}
