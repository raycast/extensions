import { LIMITS, TIMEOUTS } from "./config";
import { getLogger } from "./logger";
import { redactUrlForLog } from "./urlUtils";

const log = getLogger("fetcher");

/**
 * Common fetch options to avoid V8 RegExpCompiler crashes in Raycast's
 * memory-constrained worker. Disabling compression bypasses the decompression
 * code path that can trigger V8 memory allocation failures.
 */
const FETCH_HEADERS = {
  "Accept-Encoding": "identity",
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
    // The URL is stripped of its query string first: warn is not verbose-gated,
    // so it emits for every user, and the logger's redactor does not scrub
    // arbitrary query values. See redactUrlForLog.
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
