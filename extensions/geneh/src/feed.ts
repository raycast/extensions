/* Reads the public feed (data.geneh.app) and the bank names, kept for a few minutes so commands open fast. */
import { useCachedPromise } from "@raycast/utils";
import { GENEH_FEED, genehBankNames, type FeedSnapshot } from "./lite.js";

const KEEP = new Set(["fx_bank", "fx_cbe", "gold", "silver", "metal_spot"]);

export type Feed = { snap: FeedSnapshot; names: Record<string, { en: string; ar: string }> };

/**
 * The v2 feed names gold, silver and fund sources by neutral ids (no data sources in public). v1 stays for 30 days
 * after v2 ships, so v1 is only a fallback while v2 isn't on the CDN yet.
 */
async function getJson<T>(name: string): Promise<T> {
  for (const v of ["v2", "v1"]) {
    const r = await fetch(`${GENEH_FEED.prod}${v}/${name}`, { headers: { accept: "application/json" } });
    if (r.ok) return (await r.json()) as T;
    if (v === "v1" || (r.status !== 403 && r.status !== 404)) throw new Error(`${v}/${name}: ${r.status}`);
  }
  throw new Error(name);
}

export async function loadFeed(): Promise<Feed> {
  const [latest, catalog] = await Promise.all([
    getJson<FeedSnapshot>("latest.json"),
    getJson<Parameters<typeof genehBankNames>[0]>("catalog.json").catch(() => null),
  ]);
  return {
    snap: { generatedAt: latest.generatedAt, quotes: latest.quotes.filter((q) => KEEP.has(q.dataset)) },
    names: genehBankNames(catalog),
  };
}

/** The feed, shown from the last copy right away and refreshed in the background. */
export const useFeed = () => useCachedPromise(loadFeed, [], { keepPreviousData: true });

export const bankName = (feed: Feed | undefined, id: string, lang: "en" | "ar"): string =>
  feed?.names[id]?.[lang] ?? id.toUpperCase();
