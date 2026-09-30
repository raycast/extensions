import { getPreferenceValues } from "@raycast/api";
import { LIMITS, TIMEOUTS } from "./config";
import { getLogger } from "./logger";
import { redactUrlForLog } from "./urlUtils";

const log = getLogger("fetcher");

/**
 * The language to ask servers for, from the Page Language preference.
 *
 * WITHOUT this header a content-negotiating site picks a locale for us, and Digger
 * faithfully reports whatever it was handed: muse.ai serves
 * `<html lang="ar-AR" dir="rtl">` to a request that expresses no preference, which
 * surfaced as a Language row reading `ar-AR` for an en-US page. It affects the
 * title, description and Open Graph tags too, not just the Language row.
 *
 * It reads a PREFERENCE rather than the machine locale, because the Store
 * guidelines are explicit: "If the locale might affect functionality … please use
 * the preferences API." Deriving it from `Intl` also made the result depend on a
 * setting the user cannot see from inside Raycast, so two machines analysing the
 * same URL could legitimately disagree about its title.
 */
export function preferredLanguage(): string {
  try {
    const configured = getPreferenceValues<Preferences>().acceptLanguage?.trim();
    const tag = configured && configured !== "" ? configured : "en-US";
    const base = tag.split("-")[0];
    return base === tag ? `${tag}, *;q=0.5` : `${tag}, ${base};q=0.9, *;q=0.5`;
  } catch {
    return "en-US, en;q=0.9, *;q=0.5";
  }
}

/**
 * Common fetch options to avoid V8 RegExpCompiler crashes in Raycast's
 * memory-constrained worker. Disabling compression bypasses the decompression
 * code path that can trigger V8 memory allocation failures.
 */
const FETCH_HEADERS = {
  "Accept-Encoding": "identity",
  // A getter, not a captured value: reading the preference at module load would
  // pin whatever it was when the command started.
  get "Accept-Language"() {
    return preferredLanguage();
  },
};

export interface FetchResult {
  response: Response;
  status: number;
  headers: Record<string, string>;
  timing: number;
  finalUrl: string;
}

export interface StreamedHeadResult {
  headHtml: string;
  status: number;
  headers: Record<string, string>;
  timing: number;
  finalUrl: string;
  truncated: boolean;
}

export interface TextResourceResult {
  exists: boolean;
  content?: string;
  contentType?: string;
  status: number;
  isSoft404: boolean;
}

/** Extracts headers from a Response into a plain object */
function extractHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

/**
 * Fetches a URL and extracts only the <head> content to minimize memory usage.
 */
export async function fetchHeadOnly(
  url: string,
  timeout: number = TIMEOUTS.HTML_FETCH,
  externalSignal?: AbortSignal,
): Promise<StreamedHeadResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Link external signal to our controller
  if (externalSignal) {
    if (externalSignal.aborted) {
      throw new Error("Fetch aborted");
    }
    externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: FETCH_HEADERS,
    });

    const timing = performance.now() - startTime;
    const headers = extractHeaders(response);

    // Stream-read only up to MAX_HEAD_BYTES to avoid memory issues with large pages
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const chunks: string[] = [];
    let totalBytes = 0;
    let streamTruncated = false;

    try {
      while (totalBytes < LIMITS.MAX_HEAD_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunks.push(chunk);
        totalBytes += value.byteLength;
      }

      if (totalBytes >= LIMITS.MAX_HEAD_BYTES) {
        streamTruncated = true;
      }
    } finally {
      // Always cancel the reader to stop downloading
      reader.cancel().catch(() => {});
    }

    const partialText = chunks.join("");

    // Find where head ends (case-insensitive)
    let headHtml = partialText;
    let truncated = streamTruncated;

    const headEndMatch = partialText.match(/<\/head>/i);
    if (headEndMatch && headEndMatch.index !== undefined) {
      headHtml = partialText.slice(0, headEndMatch.index + 7);
      truncated = true;
    } else {
      // Fallback: look for <body> start
      const bodyStartMatch = partialText.match(/<body[\s>]/i);
      if (bodyStartMatch && bodyStartMatch.index !== undefined) {
        headHtml = partialText.slice(0, bodyStartMatch.index);
        truncated = true;
      } else if (partialText.length > LIMITS.MAX_HEAD_BYTES) {
        headHtml = partialText.slice(0, LIMITS.MAX_HEAD_BYTES);
        truncated = true;
      }
    }

    log.log("fetchHeadOnly:complete", { url, truncated, htmlLength: headHtml.length });
    return {
      headHtml,
      status: response.status,
      headers,
      timing,
      finalUrl: response.url,
      truncated,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw new Error("Fetch aborted");
      }
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Attempts to fetch with HTTPS first, falls back to HTTP if HTTPS fails.
 */
export async function fetchHeadOnlyWithFallback(
  url: string,
  timeout: number = TIMEOUTS.HTML_FETCH,
  signal?: AbortSignal,
): Promise<StreamedHeadResult> {
  const urlObj = new URL(url);

  // If explicitly using http://, don't try https first
  if (urlObj.protocol === "http:") {
    return fetchHeadOnly(url, timeout, signal);
  }

  try {
    return await fetchHeadOnly(url, timeout, signal);
  } catch (httpsError) {
    // A CANCELLED request is not a failed one — bail before warning or retrying.
    //
    // `fetchHeadOnly` throws a plain Error("Fetch aborted") when the caller's
    // signal fires, which arrives here indistinguishably from a genuine TLS or
    // network failure. Without this guard, every time the user retypes a URL the
    // in-flight request lands in this catch and emits an unconditional
    // "downgrade" warning for a downgrade that never happened — noise on the
    // most ordinary control-flow path there is. The HTTP retry below is equally
    // pointless: it fails instantly against the same aborted signal.
    if (signal?.aborted || (httpsError instanceof Error && httpsError.message === "Fetch aborted")) {
      throw httpsError;
    }

    // Try HTTP as fallback.
    //
    // `warn`, not `log`: this is a protocol DOWNGRADE. Everything below is read
    // over plaintext, and for a tool that reports on a site's security posture
    // that is worth surfacing even when the user has not opted into verbose
    // diagnostics — `log` would hide it from the bug report that needs it most.
    //
    // The URL is stripped of its query string first, because `warn` is NOT
    // verbose-gated — it emits for every user, including one who enabled
    // nothing. The logger's strict level would also cover this, but it is a
    // user preference and off by default, so it cannot be the protection on a
    // sink the user never opted into. See redactUrlForLog.
    const httpUrl = url.replace(/^https:\/\//i, "http://");
    log.warn("fetchHeadOnlyWithFallback:https-failed-trying-http", {
      url: redactUrlForLog(url),
      httpUrl: redactUrlForLog(httpUrl),
      reason: httpsError instanceof Error ? httpsError.message : String(httpsError),
    });

    try {
      return await fetchHeadOnly(httpUrl, timeout, signal);
    } catch {
      // Both failed, throw the original HTTPS error
      throw httpsError;
    }
  }
}

/**
 * Validates if a response is a genuine text resource (not a soft 404 HTML page).
 */
function isValidTextResource(contentType: string | undefined, content: string): boolean {
  // If Content-Type explicitly says HTML, it's a soft 404
  if (contentType) {
    const lowerContentType = contentType.toLowerCase();
    if (lowerContentType.includes("text/html") || lowerContentType.includes("application/xhtml")) {
      return false;
    }
  }

  // Check content for HTML markers
  const firstChunk = content.trim().slice(0, 500).toLowerCase();

  if (
    firstChunk.startsWith("<!doctype") ||
    firstChunk.startsWith("<html") ||
    firstChunk.startsWith("<head") ||
    firstChunk.startsWith("<body") ||
    firstChunk.startsWith("<?xml")
  ) {
    return false;
  }

  // Check for HTML tags anywhere in first chunk
  if (/<html[\s>]/.test(firstChunk) || /<head[\s>]/.test(firstChunk) || /<body[\s>]/.test(firstChunk)) {
    return false;
  }

  return true;
}

/** What the opening bytes of a response actually look like, regardless of its label. */
export type ResourceShape =
  | "html"
  | "xml"
  | "json"
  | "text"
  | "empty"
  /**
   * The opening bytes were all whitespace AND the sniff budget ran out before the
   * stream ended, so what follows is unknown. Distinct from "empty", which is a
   * response that genuinely ended with no content: a server that pads with 1KB of
   * spaces before a valid <urlset> is publishing a sitemap, and calling that
   * "empty" reports a real file as absent.
   */
  | "unknown"
  /** A bot-challenge or login interstitial: the check never got to look. */
  | "challenge";

export interface ResourceProbe {
  status: number;
  contentType?: string;
  /** Judged from the opening bytes, which is the only thing that cannot lie. */
  shape: ResourceShape;
  finalUrl: string;
  redirected: boolean;
  /** From `Content-Length`; absent on a chunked response. */
  size?: number;
}

/**
 * Markers of an interstitial: a bot challenge or a login wall served with 200.
 *
 * Such a page is HTML, so the shape rule would file it as absence — "this site
 * publishes no sitemap" inferred from a page that never let us look. The check
 * failed; it did not complete.
 */
const CHALLENGE_MARKERS =
  /just a moment|checking your browser|verify you are (?:a )?human|cf-browser-verification|_cf_chl_opt|attention required|ddos-guard|px-captcha|please enable (?:js|javascript) and cookies|incapsula/i;

/** True when the opening bytes are an HTML document rather than a data file. */
function looksLikeHtmlDocument(head: string): boolean {
  const start = head.trimStart().slice(0, 500).toLowerCase();
  return (
    start.startsWith("<!doctype html") ||
    start.startsWith("<html") ||
    start.startsWith("<head") ||
    start.startsWith("<body") ||
    /<html[\s>]/.test(start) ||
    /<head[\s>]/.test(start)
  );
}

/**
 * Classifies a response by its opening bytes.
 *
 * The Content-Type is a claim; these bytes are evidence. A single-page app
 * labels its shell `text/html` (easy), but a catch-all that labels the same
 * shell `text/plain` — or serves `{"error":"not found"}` as `application/json` —
 * defeats any header-only rule. Sniffing is what both the sitemap check and the
 * well-known sweep need, and it is the same question in both places.
 */
function sniffShape(head: string, complete: boolean): ResourceShape {
  const start = head.trimStart();
  if (start === "") return complete ? "empty" : "unknown";
  // Order matters: a challenge page IS HTML, and must not be filed as absence.
  if (CHALLENGE_MARKERS.test(start.slice(0, 2000))) return "challenge";
  if (looksLikeHtmlDocument(start)) return "html";
  if (start.startsWith("<?xml") || /^<(urlset|sitemapindex|rss|feed|xrd)[\s>:]/i.test(start)) return "xml";
  if (start.startsWith("{") || start.startsWith("[")) return "json";
  return "text";
}

/**
 * Reads only the OPENING BYTES of a resource, enough to tell what it is, then
 * cancels.
 *
 * The whole body is never downloaded here: a sitemap can be megabytes and the
 * well-known sweep issues a hundred of these, so paying for the full transfer
 * to answer "does this exist and what is it" is the wrong trade. Contents load
 * on demand when the user opens the file — the same rule robots.txt and
 * sitemap.xml already follow in the UI.
 */
export async function probeResource(
  url: string,
  options: { timeout?: number; signal?: AbortSignal } = {},
): Promise<ResourceProbe> {
  const { timeout = TIMEOUTS.RESOURCE_FETCH, signal } = options;
  const deadline = AbortSignal.timeout(timeout);
  const response = await fetch(url, {
    redirect: "follow",
    headers: FETCH_HEADERS,
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });

  const contentType = response.headers.get("content-type") || undefined;
  const contentLength = response.headers.get("content-length");

  let head = "";
  // BYTES, not characters. `head.length` counts UTF-16 units, so a budget
  // checked against it reads 3KB for 1024 three-byte characters and, worse,
  // decodes a 64KB first chunk in full before ever testing the limit.
  let bytesRead = 0;
  let complete = false;
  const reader = response.body?.getReader();
  if (reader) {
    try {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      while (bytesRead < LIMITS.SNIFF_BYTES) {
        const { done, value } = await reader.read();
        if (done) {
          complete = true;
          break;
        }
        if (!value) continue;
        const remaining = LIMITS.SNIFF_BYTES - bytesRead;
        const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
        bytesRead += slice.byteLength;
        head += decoder.decode(slice, { stream: true });
      }
      // Flush, or a multi-byte character straddling the cut is dropped.
      head += decoder.decode();
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  } else {
    complete = true;
  }

  return {
    status: response.status,
    contentType,
    shape: sniffShape(head, complete),
    finalUrl: response.url || url,
    redirected: response.redirected,
    size: contentLength ? Number(contentLength) : undefined,
  };
}

/**
 * Fetches a text resource (like robots.txt or llms.txt) and validates it's not a soft 404.
 */
export async function fetchTextResource(
  url: string,
  timeout: number = TIMEOUTS.RESOURCE_FETCH,
): Promise<TextResourceResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: FETCH_HEADERS,
    });

    const contentType = response.headers.get("content-type") || undefined;

    if (response.status < 200 || response.status >= 300) {
      return { exists: false, status: response.status, contentType, isSoft404: false };
    }

    const content = await response.text();
    const isValid = isValidTextResource(contentType, content);

    if (!isValid) {
      log.log("fetchTextResource:soft404-detected", { url, contentType });
    }

    return {
      exists: isValid,
      content: isValid ? content : undefined,
      contentType,
      status: response.status,
      isSoft404: !isValid,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Simple fetch with timeout, returning the response and metadata.
 */
export async function fetchWithTimeout(url: string, timeout: number = TIMEOUTS.RESOURCE_FETCH): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: FETCH_HEADERS,
    });

    return {
      response,
      status: response.status,
      headers: extractHeaders(response),
      timing: performance.now() - startTime,
      finalUrl: response.url,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
