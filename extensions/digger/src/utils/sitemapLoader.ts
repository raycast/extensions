import { Cache } from "@raycast/api";
import { CACHE, LIMITS, TIMEOUTS } from "./config";
import { readCappedBytes } from "./fetcher";
import { getLogger } from "./logger";
import { checkPageSuppliedUrl, fetchPageSuppliedUrl, untilAborted } from "./networkGuard";
import { decodeSitemapBody, parseSitemap, SitemapParse } from "./sitemapParse";
import { redactUrlForLog, redactUrlsInText } from "./urlUtils";

const log = getLogger("sitemap");

const cache = new Cache({ namespace: CACHE.SITEMAP_NAMESPACE, capacity: CACHE.SITEMAP_CAPACITY_BYTES });

export interface SitemapFile {
  url: string;
  /** The decoded body — what Copy as Text and the CSV export are built from. */
  text: string;
  parsed: SitemapParse;
  /** The body hit `LIMITS.SITEMAP_MAX_BYTES`; entries past the cut were never read. */
  truncated: boolean;
  fetchedAt: number;
  fromCache: boolean;
}

interface CachedBody {
  fetchedAt: number;
  truncated: boolean;
  text: string;
}

function readCache(url: string): CachedBody | undefined {
  const raw = cache.get(url);
  if (!raw) return undefined;
  try {
    // The type is a claim about what was stored, not a guarantee: validate it.
    const entry = JSON.parse(raw);
    if (typeof entry?.text !== "string" || typeof entry?.fetchedAt !== "number") return undefined;
    if (Date.now() - entry.fetchedAt > CACHE.DURATION_MS) {
      cache.remove(url);
      return undefined;
    }
    return { fetchedAt: entry.fetchedAt, truncated: entry.truncated === true, text: entry.text };
  } catch {
    return undefined;
  }
}

/** undici reports every transport error as "fetch failed"; the reason is on `cause`. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause as { code?: string; message?: string } | undefined;
  if (error.message === "fetch failed" && cause) return cause.code ?? cause.message ?? error.message;
  return error.message;
}

/**
 * One sitemap file: from the cache when fresh, otherwise fetched.
 *
 * Every fetch goes through `fetchPageSuppliedUrl`, the root one included. Child
 * sitemap URLs are chosen by the site, so they must; the root is the dug site's
 * own `/sitemap.xml`, which the guard allows without a lookup because it is on
 * the same host — one path for both, rather than a second fetcher to keep in
 * step with the first.
 *
 * Throws on any failure — a non-2xx status, a refused or unreachable host, a
 * timeout, an undecompressable body. Nothing here returns an empty sitemap to
 * stand for one it could not read.
 */
export async function loadSitemapFile(
  url: string,
  siteUrl: string,
  options: { signal: AbortSignal; refresh: boolean },
): Promise<SitemapFile> {
  const deadline = AbortSignal.timeout(TIMEOUTS.SITEMAP_FETCH);
  const signal = AbortSignal.any([options.signal, deadline]);
  try {
    // The guard runs before the cache can answer. The cache is keyed by URL
    // alone, so a body stored while digging a local host would otherwise be
    // served to a public index that merely lists the same URL. Refused here, the
    // fetch below refuses too, and that is the error reported.
    if (!options.refresh && (await untilAborted(checkPageSuppliedUrl(url, siteUrl), signal)).allowed) {
      const hit = readCache(url);
      if (hit) return { url, ...hit, parsed: parseSitemap(hit.text), fromCache: true };
    }

    log.log("fetch:start", { url });
    const response = await fetchPageSuppliedUrl(url, siteUrl, {
      signal,
      headers: { Accept: "application/xml, text/xml;q=0.9, */*;q=0.8" },
    });
    // `fetch` resolves on a 404 or a 500; only `ok` says the body is the sitemap.
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
    }
    const { bytes, truncated: cut } = await readCappedBytes(response, LIMITS.SITEMAP_MAX_BYTES);
    const { text, truncated } = decodeSitemapBody(bytes, LIMITS.SITEMAP_MAX_BYTES, cut);
    const parsed = parseSitemap(text);
    const fetchedAt = Date.now();

    // Only a sitemap is cached. An `invalid` body is usually an app shell or an
    // error page served with a 200, and pinning it for 48 hours would keep
    // reporting "not a sitemap" after the site fixed it.
    if (parsed.kind !== "invalid") cache.set(url, JSON.stringify({ fetchedAt, truncated, text }));

    log.log("fetch:done", { url, bytes: bytes.byteLength, kind: parsed.kind, truncated });
    return { url, text, parsed, truncated, fetchedAt, fromCache: false };
  } catch (error) {
    if (options.signal.aborted) throw error;
    const message = deadline.aborted ? `Timed out after ${TIMEOUTS.SITEMAP_FETCH / 1000}s` : describe(error);
    log.warn("fetch:failed", { url: redactUrlForLog(url), error: redactUrlsInText(message) });
    throw new Error(message);
  }
}
