/**
 * Duplicate guard for Save Bookmark.
 *
 * The page the user is saving is looked up in the shared library first; when it
 * is already there the matching field is marked and nothing is written. The
 * lookup is a plain `query` read, so the core, the protocol and the installed
 * helper stay unchanged.
 *
 * "Same page" is deliberately looser than string equality, because the same
 * document is routinely saved with another scheme, a `www.` host, a trailing
 * slash, a section anchor or campaign parameters. Plain `#section` anchors and
 * these parameters do not make a new document; hash routes (`#/route`, `#!route`)
 * do, so they stay part of the key.
 */
import { Failure, entity as assertEntity, rpc, type QueryResult, type Session } from "../helper";
import { inputUrl } from "./url";

export type SavedEntity = QueryResult["items"][number];
export type SavedHit = { link: string; entity: SavedEntity };

/** Campaign/session parameters that never select a different document. */
const TRACKING =
  /^(?:utm_|ga_|pk_|mtm_|mc_|_hs|vero_|fbclid$|gclid$|dclid$|msclkid$|igshid$|yclid$|srsltid$)/i;

/** Query pages hold 200 items at most; a personal library rarely needs more than one. */
const PAGE = 200;
const SCAN = PAGE * 5;

function parse(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

function hostOf(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function pathOf(url: URL) {
  // `/page/` and `/page` are the same document; the root path becomes empty so
  // `https://a.com` and `https://a.com/` agree.
  return url.pathname.replace(/\/+$/, "");
}

function hashOf(url: URL) {
  return /^#(?:!|\/)/.test(url.hash) ? url.hash : "";
}

/**
 * Identity of the document behind a URL, or null for anything that cannot be
 * opened as a web page. Scheme and `www.` are normalised away on purpose.
 */
export function canonicalUrl(value: string): string | null {
  const url = parse(value);
  if (!url) return null;
  const search = [...url.searchParams]
    .filter(([key]) => !TRACKING.test(key))
    .map(([key, item]) => encodeURIComponent(key) + "=" + encodeURIComponent(item))
    .sort()
    .join("&");
  return (
    "//" +
    hostOf(url) +
    (url.port ? ":" + url.port : "") +
    pathOf(url) +
    (search ? "?" + search : "") +
    hashOf(url)
  );
}

/** Complete fields may be checked while another row is still being typed. */
export function lookupKey(inputs: string[]): { key: string; links: string[] } | null {
  const links = inputs.flatMap((input) => {
    try {
      const link = inputUrl(input);
      const host = new URL(link).hostname;
      return host.includes(".") || host === "localhost" ? [link] : [];
    } catch {
      return [];
    }
  });
  const keys = [...new Set(links.map((link) => canonicalUrl(link)!))].sort();
  return keys.length ? { key: JSON.stringify(keys), links } : null;
}

function page(value: unknown): QueryResult {
  const result = value as QueryResult;
  if (
    !result ||
    typeof result !== "object" ||
    !Array.isArray(result.items) ||
    typeof result.total !== "number" ||
    !Number.isInteger(result.total) ||
    result.total < 0 ||
    typeof result.revision !== "string"
  )
    throw new Failure("INVALID_RESPONSE", "Invalid bookmark lookup.");
  return result;
}

/**
 * Active bookmarks whose document matches one of `links`. Trashed entries are
 * not returned by `query`, so a page in the trash can be saved again.
 */
export async function findSaved(
  session: Session,
  links: string[],
  signal?: AbortSignal,
  excludeId?: string,
): Promise<SavedHit[]> {
  const targets = new Map<string, string>();
  for (const link of links) {
    const canonical = canonicalUrl(link);
    if (canonical && !targets.has(canonical)) targets.set(canonical, link);
  }
  if (!targets.size) return [];
  const hits: SavedHit[] = [];
  const seen = new Set<string>();
  let revision: string | undefined;
  {
    // Canonical URL spellings need not be literal substrings of stored text.
    // Scan once for all targets; incomplete scans remain an explicit error.
    let offset = 0;
    let limit = PAGE;
    const pageIds = new Set<string>();
    while (offset < SCAN) {
      let result: QueryResult;
      try {
        result = page(
          await rpc(session.installation, "query", { kind: "bookmark", offset, limit }, session.libraryId, {
            signal,
          }),
        );
      } catch (error) {
        // Very long notes can push a full page past the protocol limit; the
        // smaller page still contains whole rows, never truncated text.
        if (error instanceof Failure && error.code === "TOO_LARGE" && limit > 1) {
          limit = Math.max(1, Math.floor(limit / 2));
          continue;
        }
        throw error;
      }
      if (revision !== undefined && revision !== result.revision)
        throw new Failure(
          "DUPLICATES_UNCONFIRMED",
          "Cannot confirm duplicates: the library changed during the scan.",
        );
      revision = result.revision;
      if (!result.items.length && offset < result.total)
        throw new Failure("DUPLICATES_UNCONFIRMED", "Cannot confirm duplicates: incomplete scan.");
      for (const item of result.items) {
        assertEntity(item);
        if (item.kind !== "bookmark" || item.purged || item.values.life !== "active" || pageIds.has(item.id))
          throw new Failure(
            "DUPLICATES_UNCONFIRMED",
            "Cannot confirm duplicates: invalid or repeated candidate.",
          );
        pageIds.add(item.id);
        if (item.id === excludeId || seen.has(item.id)) continue;
        const link = targets.get(canonicalUrl(String(item.values.url ?? "")) ?? "");
        if (!link) continue;
        seen.add(item.id);
        hits.push({ link, entity: item });
      }
      offset += result.items.length;
      if (offset >= result.total) break;
      if (offset >= SCAN)
        throw new Failure(
          "DUPLICATES_UNCONFIRMED",
          "Cannot confirm duplicates: more than 1000 candidates; scan incomplete.",
        );
    }
  }
  return hits;
}
