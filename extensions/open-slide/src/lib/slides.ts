import { readCache, writeCache } from "./cache";
import { listSites } from "./sites";
import {
  type DeckChunk,
  type FoldersManifest,
  parseDeckChunk,
  parseFolders,
  parseSlidesModule,
  type SlidesModule,
} from "./parse";
import type { Deck, Site, SlideIndex, SourceFailure } from "./types";

const TIMEOUT_MS = 15000;
const DECK_CONCURRENCY = 6;

/**
 * Bumped whenever the shape of `Deck` changes.
 *
 * It keys both this module's caches and — because `useCachedPromise` derives
 * its cache key from the arguments it is given — the snapshot the list renders
 * on mount. Without it, a payload written by an older build is replayed into
 * the UI with fields the new code expects to exist.
 */
export const INDEX_VERSION = "v8";

export class SourceError extends Error {}

async function fetchText(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new SourceError("Couldn't reach this URL");
  }
  if (!response.ok) {
    throw new SourceError(`Server responded with ${response.status}`);
  }
  return response.text();
}

/** The entry chunk carries a content hash, so its name is the index's version. */
function findEntryChunk(html: string, base: string): string {
  for (const tag of html.matchAll(/<script\b[^>]*>/gi)) {
    const attrs = tag[0];
    if (!/type\s*=\s*["']module["']/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) return new URL(src, `${base}/`).toString();
  }
  throw new SourceError("This URL isn't an open-slide site");
}

type IndexCache = { entry: string; module: SlidesModule; folders: FoldersManifest };

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Builds the deck list for one site.
 *
 * Always hits the network — but only for the ~500 byte index.html. Every asset
 * below it is content-hashed, so an unchanged entry chunk means the whole index
 * is unchanged and nothing else is fetched.
 */
export async function loadSite(site: Site, version: string = INDEX_VERSION): Promise<Deck[]> {
  const { base } = site;
  const entry = findEntryChunk(await fetchText(`${base}/`), base);

  const cached = readCache<IndexCache>(`idx:${version}:${base}`);
  let module: SlidesModule;
  let folders: FoldersManifest;
  if (cached?.entry === entry) {
    module = cached.module;
    folders = cached.folders;
  } else {
    try {
      const main = await fetchText(entry);
      module = parseSlidesModule(main);
      folders = parseFolders(main);
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError("Couldn't read this site's deck index — it may be an unsupported open-slide version");
    }
    writeCache(`idx:${version}:${base}`, { entry, module, folders } satisfies IndexCache);
  }

  const ids = Object.keys(module.chunks);
  const decks = await mapLimit(ids, DECK_CONCURRENCY, async (id): Promise<Deck> => {
    const chunk = module.chunks[id];
    const cacheKey = `deck:${version}:${base}:${chunk}`;
    let parsed = readCache<DeckChunk>(cacheKey);
    if (!parsed) {
      try {
        parsed = parseDeckChunk(await fetchText(new URL(chunk, entry).toString()));
        writeCache(cacheKey, parsed);
      } catch {
        // One unreadable deck shouldn't hide the rest of the site.
        parsed = { title: null, pageCount: null, notes: [], pages: [], text: [] };
      }
    }
    const theme = module.themes[id] ?? null;
    return {
      key: `${base}#${id}`,
      id,
      title: parsed.title ?? id,
      theme,
      folder: folders.byDeck[id] ?? null,
      createdAt: module.createdAt[id] ?? null,
      pageCount: parsed.pageCount,
      notes: parsed.notes,
      pages: parsed.pages,
      text: parsed.text,
      url: `${base}/s/${encodeURIComponent(id)}`,
      presenterUrl: `${base}/s/${encodeURIComponent(id)}/presenter`,
      themeUrl: theme ? `${base}/themes/${encodeURIComponent(theme)}` : null,
      site,
    };
  });

  return decks.sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return a.title.localeCompare(b.title);
  });
}

/** Loads every site in parallel; one bad source never hides the others. */
export async function loadIndex(version: string = INDEX_VERSION): Promise<SlideIndex> {
  const sites = await listSites();
  const settled = await Promise.allSettled(sites.map((d) => loadSite(d, version)));

  const decks: Deck[] = [];
  const failures: SourceFailure[] = [];
  settled.forEach((result, index) => {
    const site = sites[index];
    if (result.status === "fulfilled") decks.push(...result.value);
    else {
      const reason = result.reason;
      failures.push({
        site,
        message: reason instanceof Error ? reason.message : "Failed to load",
      });
    }
  });

  return { sites, decks, failures };
}
