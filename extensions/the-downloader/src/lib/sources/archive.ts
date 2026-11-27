import { decodeHtml } from "../charset.js";
import { LinkContext, LinkLoadError } from "../link-context.js";
import { HttpError, SafeFetchOptions, SafeResponse, safeFetch } from "../safe-fetch.js";
import { parsePage } from "./page.js";

// The Internet Archive's saved copy of a page, for when the live page won't
// let the reader in (a bot wall, a login) or is gone. The Wayback Machine
// honours publishers who ask to be left out, so this reads only what they
// allow to be archived.

const TIMEOUT_MS = 30_000;
/**
 * web.archive.org answers a browser User-Agent over HTTP/1.1 with HTTP 429
 * (it looks like a bot posing as a browser), so the reader says who it is.
 */
const USER_AGENT = "Mozilla/5.0 (compatible; TheDownloader; Raycast extension)";
const MAX_BYTES = 5 * 1024 * 1024;

export type Snapshot = {
  /** The page as it was saved, without the Wayback toolbar (`id_`). */
  rawUrl: string;
  /** The same copy as people see it on web.archive.org. */
  viewUrl: string;
  /** `YYYY-MM-DD`. */
  savedOn: string;
};

/** The Wayback Machine's availability API for `url`. */
export function availabilityUrl(url: string): string {
  return `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
}

/**
 * The latest usable copy from an availability answer: saved with HTTP 200 (a
 * 204 or a redirect saved nothing to read). The snapshot URLs are built from
 * the page asked about and the timestamp, never taken from the answer.
 */
export function parseAvailability(json: unknown, url: string): Snapshot | undefined {
  const closest = (json as { archived_snapshots?: { closest?: Record<string, unknown> } } | null)?.archived_snapshots
    ?.closest;
  if (!closest?.available || String(closest.status) !== "200") return undefined;
  const timestamp = String(closest.timestamp ?? "");
  if (!/^\d{14}$/.test(timestamp)) return undefined;
  return {
    rawUrl: `https://web.archive.org/web/${timestamp}id_/${url}`,
    viewUrl: `https://web.archive.org/web/${timestamp}/${url}`,
    savedOn: `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`,
  };
}

/** safeFetch, with the Internet Archive's rate limits and outages in plain words. */
async function fromArchive(url: string, options: SafeFetchOptions): Promise<SafeResponse> {
  try {
    return await safeFetch(url, { ...options, userAgent: USER_AGENT });
  } catch (error) {
    if (error instanceof HttpError && [429, 502, 503, 504].includes(error.status)) {
      throw new LinkLoadError(`The Internet Archive is busy right now (HTTP ${error.status}). Try again in a minute.`);
    }
    throw error;
  }
}

/** Read the Internet Archive's latest copy of a page, as that page. The URL must already be validated. */
export async function loadArchivedPage(url: string, options: { signal?: AbortSignal }): Promise<LinkContext> {
  const answer = await fromArchive(availabilityUrl(url), {
    signal: options.signal,
    accept: ["application/json"],
    maxBytes: 256 * 1024,
    timeoutMs: TIMEOUT_MS,
  });
  let snapshot: Snapshot | undefined;
  try {
    snapshot = parseAvailability(JSON.parse(answer.body.toString("utf8")), url);
  } catch {
    snapshot = undefined;
  }
  if (!snapshot) throw new LinkLoadError("The Internet Archive has no saved copy of this page.");

  const page = await fromArchive(snapshot.rawUrl, {
    signal: options.signal,
    accept: ["text/html", "application/xhtml+xml"],
    maxBytes: MAX_BYTES,
    timeoutMs: TIMEOUT_MS,
  });
  const ctx = parsePage(decodeHtml(page.body, page.contentType), url);
  return {
    ...ctx,
    facts: [{ label: "Read from", value: `the Internet Archive's copy saved ${snapshot.savedOn}` }, ...ctx.facts],
    archive: { viewUrl: snapshot.viewUrl, savedOn: snapshot.savedOn },
  };
}
