import { LIMITS, TIMEOUTS } from "./config";
import { forEachWithConcurrency, readCappedText } from "./fetcher";
import { getLogger } from "./logger";
import { fetchPageSuppliedUrl } from "./networkGuard";
import { ExternalSprite, parseSvgDocument, rebuildSpriteSymbols, SvgAsset } from "./svgUtils";
import { redactUrlForLog, redactUrlsInText } from "./urlUtils";

const log = getLogger("svg");

/**
 * Reads one SVG file the page referenced, as a standalone document.
 *
 * The URL came from page content, so every hop goes through the network guard.
 * Throws rather than returning something SVG-shaped: on a non-2xx (a resolved
 * 404 is not a file), on a body cut off at the size cap (half an SVG is broken
 * markup), and on a body whose ROOT is not `<svg>` — a soft-404 HTML page with
 * an icon in its header contains `<svg` too, and is still not an SVG file.
 */
export async function fetchSvgFile(
  url: string,
  pageUrl: string,
  signal?: AbortSignal,
): Promise<{ markup: string; finalUrl: string }> {
  const timeout = AbortSignal.timeout(TIMEOUTS.SVG_FILE);
  const response = await fetchPageSuppliedUrl(url, pageUrl, {
    headers: { "Accept-Encoding": "identity", Accept: "image/svg+xml,*/*;q=0.8" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`HTTP ${response.status}`);
  }
  const { text, truncated } = await readCappedText(response, LIMITS.MAX_SVG_FILE_BYTES);
  if (truncated) {
    // Reaching the cap is reported as truncation without a further read (see
    // readCappedText), so this is "at least", not "more than".
    throw new Error(`${Math.round(LIMITS.MAX_SVG_FILE_BYTES / 1024 / 1024)} MB or larger`);
  }
  const markup = parseSvgDocument(text);
  if (markup === undefined) {
    const type = response.headers.get("content-type") ?? "unknown type";
    throw new Error(`Not an SVG (${type.split(";")[0]})`);
  }
  // Redirects are followed hop by hop, so `response.url` is the last hop's URL
  // only when the runtime sets it; fall back to the requested one.
  return { markup, finalUrl: response.url || url };
}

function warnUnreadable(event: string, url: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  log.warn(event, { url: redactUrlForLog(url), error: redactUrlsInText(message) });
}

/** A sprite load that read nothing and failed nothing — no files, or a canceled load. */
export const EMPTY_SPRITES: ExternalSpriteResult = { assets: [], unchecked: 0, skipped: 0, missing: 0 };

export interface ExternalSpriteResult {
  assets: SvgAsset[];
  /** Files that could not be read. Their symbols are unknown, not absent. */
  unchecked: number;
  /** Files beyond LIMITS.MAX_SPRITE_FILES, not attempted. */
  skipped: number;
  /** Symbol ids a file was read for but does not define. */
  missing: number;
}

/**
 * Reads the external sprite files a page's `<use href="file.svg#id">` elements
 * point at, and rebuilds each referenced symbol as a standalone SVG.
 *
 * Never throws: a file that fails is counted in `unchecked`, because the icons
 * it holds are unknown, which is not the same as a sprite that defines none.
 */
export async function loadExternalSprites(
  sprites: readonly ExternalSprite[],
  pageUrl: string,
  signal?: AbortSignal,
): Promise<ExternalSpriteResult> {
  const targets = sprites.slice(0, LIMITS.MAX_SPRITE_FILES);
  const settled = await Promise.allSettled(targets.map((s) => fetchSvgFile(s.url, pageUrl, signal)));

  const assets: SvgAsset[] = [];
  let unchecked = 0;
  let missing = 0;
  // Leaving the view aborts these requests. That is not a sprite failing, and
  // the result is about to be discarded, so neither count nor log it.
  if (signal?.aborted) return EMPTY_SPRITES;

  settled.forEach((result, i) => {
    const sprite = targets[i];
    if (result.status === "rejected") {
      unchecked++;
      warnUnreadable("sprite:unchecked", sprite.url, result.reason);
      return;
    }
    // Relative references inside the file resolve against where it was actually served from.
    const rebuilt = rebuildSpriteSymbols(result.value.markup, result.value.finalUrl, sprite.uses);
    missing += sprite.ids.length - rebuilt.length;
    assets.push(...rebuilt);
  });

  return { assets, unchecked, skipped: sprites.length - targets.length, missing };
}

/** What a file-backed SVG's thumbnail can show: its markup, or why there is none. */
export type RemoteSvg = { markup: string } | { error: string };

/**
 * Downloads file-backed SVGs so the grid can draw them, through the network
 * guard.
 *
 * Handing Raycast the page's URL as a tile source would let Raycast fetch it —
 * outside the guard, redirects and all — so a page could point a "thumbnail"
 * at a router or a metadata endpoint. Fetching here and rendering the markup
 * keeps every page-chosen request behind the same check. Bounded in count and
 * concurrency; files past the cap simply have no thumbnail.
 */
export async function loadRemoteSvgs(
  assets: readonly SvgAsset[],
  pageUrl: string,
  signal?: AbortSignal,
): Promise<Map<string, RemoteSvg>> {
  const targets = assets.filter((a) => a.markup === undefined && a.url).slice(0, LIMITS.MAX_REMOTE_SVGS);
  const out = new Map<string, RemoteSvg>();
  await forEachWithConcurrency(
    targets,
    LIMITS.REMOTE_SVG_CONCURRENCY,
    async (asset) => {
      try {
        out.set(asset.key, { markup: (await fetchSvgFile(asset.url!, pageUrl, signal)).markup });
      } catch (error) {
        if (signal?.aborted) return;
        out.set(asset.key, { error: error instanceof Error ? error.message : String(error) });
        warnUnreadable("svg-file:unchecked", asset.url!, error);
      }
    },
    signal,
  );
  return out;
}
