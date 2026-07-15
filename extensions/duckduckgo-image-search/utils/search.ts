import axios, { AxiosError } from "axios";
import { decode } from "html-entities";

import { DDG_URL, DEFAULT_RETRIES, DEFAULT_SLEEP, DEFAULT_TIMEOUT, HEADERS, ImageSearchOptions } from "./consts";

export interface DuckDuckGoImage {
  height: number;
  image: string;
  image_token: string;
  source: "Bing" | string;
  thumbnail: string;
  thumbnail_token: string;
  title: string;
  url: string;
  width: number;
}

interface DuckDuckGoSearchResponse {
  next?: string; // 'i.js?q=Query&o=json&p=-1&s=100&u=bing&f=,,,&l=en-us'
  query: string;
  queryEncoded: string;
  response_type: "images";
  results: DuckDuckGoImage[];
}

export interface ImageSearchResult {
  next?: string;
  vqd: string;
  results: DuckDuckGoImage[];
}

export class SearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

class OldVQDError extends Error {}

// Reuse one Axios client so VQD acquisition and image requests keep the same
// proxy behavior, connection pool, headers, and timeout.
const ddgClient = axios.create({
  baseURL: DDG_URL,
  headers: HEADERS,
  timeout: DEFAULT_TIMEOUT,
});

function sleepPromise(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

/** @internal */
const VQD_PATTERNS = [/vqd=["']([^"']+)["']/, /vqd=([^&"'\s]+)/];

/**
 * Get the VQD of a search query.
 * @param query The query to search
 * @param ia The type(?) of search
 * @param signal Abort Signal controller
 * @returns The VQD
 */
async function getVQD(query: string, ia = "web", signal?: AbortSignal) {
  try {
    const response = await ddgClient.get("/", {
      // DDG only caches this page for a second, but a cached response can contain
      // a VQD that has already become invalid by the time i.js receives it.
      params: { q: query, ia, _: Date.now().toString() },
      headers: { ...HEADERS, "cache-control": "no-cache", pragma: "no-cache" },
      signal,
    });
    const html = typeof response.data === "string" ? response.data : "";
    const match = VQD_PATTERNS.map((pattern) => pattern.exec(html)).find(Boolean);
    if (!match) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`Failed to extract VQD from response for query "${query}".`);
    }
    return match[1];
  } catch (error) {
    if (error instanceof AxiosError && error.code === "ERR_CANCELED") {
      console.log("VQD request canceled");
      return;
    }
    logRequestError("get-vqd", error);
    throw new SearchUnavailableError("DuckDuckGo is temporarily unavailable. Please wait a moment and try again.");
  }
}

function queryString(query: Record<string, string>) {
  return new URLSearchParams(query).toString();
}

async function makeNextFromQuery(
  query: string,
  options: ImageSearchOptions = {},
  signal?: AbortSignal,
): Promise<{ next: string; vqd: string } | undefined> {
  let vqd: string | undefined = options.vqd!;
  if (!vqd) vqd = await getVQD(query, "web", signal);
  if (!vqd) return;

  // DuckDuckGo expects six fixed filter slots:
  // time, size, color, type, layout, license.
  const filters = [
    "",
    options.filters?.size ? `size:${options.filters.size}` : "",
    options.filters?.color ? `color:${options.filters.color}` : "",
    options.filters?.type ? `type:${options.filters.type}` : "",
    options.filters?.layout ? `layout:${options.filters.layout}` : "",
    options.filters?.license ? `license:${options.filters.license}` : "",
  ];

  const queryObject: Record<string, string> = {
    ct: "AT",
    l: options.locale || "en-us",
    o: "json",
    q: query,
    p: options.moderate ? "1" : "-1",
  };
  if (filters.some(Boolean)) queryObject.f = filters.join(",");

  return {
    next: `i.js?${queryString(queryObject)}`,
    vqd,
  };
}

export async function imageSearch(
  query: string,
  options: ImageSearchOptions = {},
  signal?: AbortSignal,
): Promise<ImageSearchResult> {
  console.log(`Searching for "${query}"...`);
  // VQD is tied to a search session. Never reuse one global token for unrelated queries.
  let rejectedVqd: string | undefined;
  for (let vqdAttempt = 0; vqdAttempt < 2; vqdAttempt += 1) {
    const data = await makeNextFromQuery(query, options, signal);
    if (!data) return { vqd: "", results: [] };
    if (data.vqd === rejectedVqd) {
      throw new SearchUnavailableError("DuckDuckGo returned the same rejected search session. Please try again.");
    }
    try {
      return await imageNextSearch(data.next, data.vqd, signal);
    } catch (error) {
      if (error instanceof OldVQDError && vqdAttempt === 0) {
        rejectedVqd = data.vqd;
        continue;
      }
      if (error instanceof OldVQDError) {
        throw new SearchUnavailableError("DuckDuckGo rejected the search session. Please wait and try again.");
      }
      throw error;
    }
  }
  return { vqd: "", results: [] };
}

function logRequestError(stage: string, error: unknown, attempt?: number) {
  if (error instanceof AxiosError) {
    console.error(stage, {
      code: error.code,
      status: error.response?.status,
      attempt,
      hostname: error.config?.url ? new URL(error.config.url, DDG_URL).hostname : undefined,
    });
    return;
  }
  console.error(stage, error instanceof Error ? error.message : String(error));
}

function isRetryable(error: AxiosError) {
  const status = error.response?.status;
  if (status) return status === 408 || status === 425 || status >= 500;
  return error.code !== "ERR_CANCELED";
}

export async function imageNextSearch(next: string, vqd: string, signal?: AbortSignal): Promise<ImageSearchResult> {
  if (!vqd) return { vqd: "", results: [] };
  console.log("Loading DuckDuckGo image results...");
  const separator = next.includes("?") ? "&" : "?";
  const reqUrl = `${next}${separator}vqd=${encodeURIComponent(vqd)}`;
  let attempt = 0;

  let data: DuckDuckGoSearchResponse | null = null;

  while (true) {
    try {
      const response = await ddgClient.get(reqUrl, { signal });

      data = response.data as DuckDuckGoSearchResponse;
      if (!data || !Array.isArray(data.results)) {
        throw new SearchUnavailableError("DuckDuckGo returned an anti-bot response. Please wait and try again.");
      }
      console.log(`DuckDuckGo returned ${data.results.length} images${attempt ? ` (attempt ${attempt + 1})` : ""}.`);
      break;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === "ERR_CANCELED") {
          console.log("VQD request canceled");
          return { results: [], vqd };
        }
        if (error.response?.status === 403) {
          throw new OldVQDError();
        }
        if (error.response?.status === 429) {
          throw new SearchUnavailableError("DuckDuckGo rate-limited this search. Please wait before trying again.");
        }
        if (!isRetryable(error)) {
          logRequestError("image-search", error, attempt + 1);
          throw new SearchUnavailableError("Could not reach DuckDuckGo. Please try again later.");
        }
      }
      if (error instanceof SearchUnavailableError) throw error;
      attempt += 1;
      logRequestError("image-search", error, attempt);
      if (attempt > DEFAULT_RETRIES) {
        throw new SearchUnavailableError("Could not reach DuckDuckGo after a retry.");
      }
      const delay = DEFAULT_SLEEP + Math.floor(Math.random() * 250);
      await sleepPromise(delay, signal);
      if (signal?.aborted) return { results: [], vqd };
    }
  }
  const result: ImageSearchResult = {
    vqd,
    results: data.results.map((r) => ({
      ...r,
      title: decode(r.title),
    })),
  };
  if (data.next) result.next = data.next;
  return result;
}
