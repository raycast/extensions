import type { KV } from "./kv";

/** Riot's public static-data CDN: no key needed. */
export const DDRAGON = "https://ddragon.leagueoflegends.com";
/** CommunityDragon hosts assets Data Dragon lacks, like ranked emblems. */
export const CDRAGON = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default";

const TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_KEY = "statics:1";

export interface Statics {
  /** Latest Data Dragon version, e.g. "16.18.1". */
  version: string;
  versions: string[];
  champions: Record<number, { id: string; name: string }>;
  items: Record<number, { name: string; gold: number; plaintext: string }>;
  spells: Record<number, { id: string; name: string }>;
  checkedAt: number;
}

interface KeyedEntry {
  key: string;
  id: string;
  name: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Data Dragon request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

function readCached(kv: KV): Statics | undefined {
  const raw = kv.get(CACHE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Statics;
  } catch {
    return undefined;
  }
}

function indexByKey(data: Record<string, KeyedEntry>): Record<number, { id: string; name: string }> {
  const out: Record<number, { id: string; name: string }> = {};
  for (const entry of Object.values(data)) out[Number(entry.key)] = { id: entry.id, name: entry.name };
  return out;
}

/**
 * Champion, item and summoner-spell tables for the newest patch. Only a few dozen KB survive slimming, and they
 * are refreshed at most every 12 hours (and only re-downloaded when the patch actually changed).
 */
export async function loadStatics(kv: KV, now = Date.now()): Promise<Statics> {
  const cached = readCached(kv);
  if (cached && now - cached.checkedAt < TTL_MS) return cached;

  try {
    const versions = await getJson<string[]>(`${DDRAGON}/api/versions.json`);
    const version = versions[0];

    if (cached && cached.version === version) {
      const refreshed = { ...cached, versions, checkedAt: now };
      kv.set(CACHE_KEY, JSON.stringify(refreshed));
      return refreshed;
    }

    const base = `${DDRAGON}/cdn/${version}/data/en_US`;
    const [champions, items, spells] = await Promise.all([
      getJson<{ data: Record<string, KeyedEntry> }>(`${base}/champion.json`),
      getJson<{ data: Record<string, { name: string; plaintext?: string; gold: { total: number } }> }>(
        `${base}/item.json`,
      ),
      getJson<{ data: Record<string, KeyedEntry> }>(`${base}/summoner.json`),
    ]);

    const statics: Statics = {
      version,
      versions,
      champions: indexByKey(champions.data),
      items: Object.fromEntries(
        Object.entries(items.data).map(([id, item]) => [
          Number(id),
          { name: item.name, gold: item.gold.total, plaintext: item.plaintext ?? "" },
        ]),
      ),
      spells: indexByKey(spells.data),
      checkedAt: now,
    };
    kv.set(CACHE_KEY, JSON.stringify(statics));
    return statics;
  } catch (error) {
    // A stale table is far better than none.
    if (cached) return cached;
    throw error;
  }
}

/** Data Dragon version for a match's patch (e.g. "16.18.817.5716" becomes "16.18.1"), else the newest one. */
export function versionForPatch(gameVersion: string | undefined, statics: Statics): string {
  const [major, minor] = (gameVersion ?? "").split(".");
  const candidate = `${major}.${minor}.1`;
  return statics.versions.includes(candidate) ? candidate : statics.version;
}
