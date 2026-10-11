// Raycast Cache over Entry, keyed by term and language. 30-day TTL: etymologies
// are close to immutable, and an uncached search hits Wikimedia on every
// keystroke, which is the fastest way to get a User-Agent blocked.

import { Cache } from "@raycast/api";
import { Entry } from "./model";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Bump on any change to how wikitext is turned into an Entry.
 *
 * Parsing happens once, at fetch time, and the result is what gets stored: a
 * gloss is already plain text by the time it reaches the cache. So a fix to the
 * parser cannot reach a word someone has already looked up — teaching the
 * renderer about `{{chemf}}` left every cached entry still reading "an inorganic
 * compound (of molecular formula )", for thirty days, with nothing to show that
 * the fix had landed. Versioning the key retires those entries instead.
 *
 * 1: initial
 * 2: {{chemf}}, {{U}}, cognate argument order
 */
const PARSE_VERSION = 2;

const cache = new Cache({ namespace: "entries" });

/**
 * Case-sensitive, because Wiktionary titles are. `Polish` and `polish` are two
 * different pages with two different etymologies, and lowercasing the key served
 * whichever was looked up first for both, for thirty days.
 */
function key(term: string, lang: string): string {
  return `v${PARSE_VERSION}:${lang}:${term}`;
}

export function read(term: string, lang: string): Entry | undefined {
  const raw = cache.get(key(term, lang));
  if (!raw) return undefined;

  try {
    const entry = JSON.parse(raw) as Entry;
    if (Date.now() - entry.fetchedAt > TTL_MS) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

export function write(entry: Entry): void {
  cache.set(key(entry.term, entry.lang), JSON.stringify(entry));
}

export function clear(): void {
  cache.clear();
}
