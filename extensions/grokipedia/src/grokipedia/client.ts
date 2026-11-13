import { setTimeout as delay } from "node:timers/promises";
import {
  GrokipediaError,
  GrokipediaAPIError,
  GrokipediaBadRequestError,
  GrokipediaNotFoundError,
  GrokipediaRateLimitError,
  GrokipediaServerError,
  GrokipediaNetworkError,
  GrokipediaValidationError,
} from "./errors";
import { parsePageResponse, parseSearchResponse, isRecord } from "./responses";
import { normalizeArticleSlug } from "./articles";
import { PageResponse, SearchResponse, ConstantsResponse, StatsResponse } from "./types";

interface GrokipediaClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
  retryBackoffFactor?: number;
  retryBackoffJitter?: boolean;
}

const retryableStatuses = new Set([429, 500, 502, 503, 504]);

export class GrokipediaClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBackoffFactor: number;
  private readonly retryBackoffJitter: boolean;

  constructor(options: GrokipediaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://grokipedia.com";
    this.userAgent = options.userAgent ?? "Grokipedia Raycast Extension";
    this.timeout = options.timeout ?? 15000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBackoffFactor = options.retryBackoffFactor ?? 0.5;
    this.retryBackoffJitter = options.retryBackoffJitter !== false;
    if (
      !Number.isFinite(this.timeout) ||
      this.timeout <= 0 ||
      !Number.isInteger(this.maxRetries) ||
      this.maxRetries < 0 ||
      !Number.isFinite(this.retryBackoffFactor) ||
      this.retryBackoffFactor < 0
    ) {
      throw new GrokipediaValidationError("Invalid request timeout or retry settings.");
    }
  }

  private calculateBackoff(attempt: number): number {
    const backoff = this.retryBackoffFactor * 2 ** attempt * 1000;
    return backoff + (this.retryBackoffJitter ? Math.random() * 0.1 * backoff : 0);
  }

  private async request(path: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    url.search = new URLSearchParams(params).toString();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      signal?.throwIfAborted();
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeout);
      let retryDelay = this.calculateBackoff(attempt);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent, Accept: "application/json" },
          signal: controller.signal,
        });

        if (response.ok) {
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            throw new GrokipediaValidationError(
              "Grokipedia returned an invalid response. Try again or open the website in your browser.",
            );
          }
        }

        if (!retryableStatuses.has(response.status) || attempt === this.maxRetries) {
          this.handleHTTPError(response.status, await response.text());
        }

        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = Number(retryAfter);
          const wait = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
          if (Number.isFinite(wait) && wait >= 0) retryDelay = Math.min(wait, 30000);
        }
        await response.body?.cancel();
      } catch (error) {
        signal?.throwIfAborted();
        // API and validation failures retain their type and do not become network errors.
        if (error instanceof GrokipediaError) throw error;
        if (attempt === this.maxRetries) {
          throw new GrokipediaNetworkError(
            timedOut
              ? "Grokipedia took too long to respond. Try again."
              : "Could not connect to Grokipedia. Check your connection and try again.",
          );
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", abort);
      }

      await delay(retryDelay, undefined, { signal });
    }

    throw new GrokipediaNetworkError("Could not connect to Grokipedia. Try again.");
  }

  private handleHTTPError(status: number, body: string): never {
    if (status === 400) {
      throw new GrokipediaBadRequestError(
        "Grokipedia could not process this request. Try a different query.",
        status,
        body,
      );
    }
    if (status === 404) throw new GrokipediaNotFoundError("This Grokipedia article could not be found.", status, body);
    if (status === 429) {
      throw new GrokipediaRateLimitError("Grokipedia is receiving too many requests. Try again later.", status, body);
    }
    if (status >= 500 && status < 600) {
      throw new GrokipediaServerError("Grokipedia is temporarily unavailable. Try again later.", status, body);
    }
    throw new GrokipediaAPIError(
      status === 403
        ? "Grokipedia blocked this request. Try opening the website in your browser."
        : `Grokipedia request failed (HTTP ${status}). Try again.`,
      status,
      body,
    );
  }

  async search(query: string, limit = 12, offset = 0, signal?: AbortSignal): Promise<SearchResponse> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return { results: [], totalCount: 0 };
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) {
      throw new GrokipediaValidationError("Use a limit between 1 and 50 and a non-negative integer offset.");
    }
    return parseSearchResponse(
      await this.request(
        "/api/full-text-search",
        { query: trimmedQuery, limit: String(limit), offset: String(offset) },
        signal,
      ),
    );
  }

  async getPage(slug: string, signal?: AbortSignal): Promise<PageResponse> {
    // The website now loads article Markdown and citations from page-preview.
    return parsePageResponse(await this.request("/api/page-preview", { slug: normalizeArticleSlug(slug) }, signal));
  }

  async getConstants(): Promise<ConstantsResponse> {
    const data = await this.request("/api/constants");
    if (
      !isRecord(data) ||
      typeof data.accountUrl !== "string" ||
      typeof data.grokComUrl !== "string" ||
      typeof data.appEnv !== "string"
    ) {
      throw new GrokipediaValidationError("Invalid Grokipedia constants response.");
    }
    return { accountUrl: data.accountUrl, grokComUrl: data.grokComUrl, appEnv: data.appEnv };
  }

  async getStats(): Promise<StatsResponse> {
    const data = await this.request("/api/stats");
    if (
      !isRecord(data) ||
      typeof data.totalPages !== "string" ||
      typeof data.totalViews !== "number" ||
      typeof data.avgViewsPerPage !== "number" ||
      typeof data.indexSizeBytes !== "string" ||
      typeof data.statsTimestamp !== "string"
    ) {
      throw new GrokipediaValidationError("Invalid Grokipedia stats response.");
    }
    return {
      totalPages: data.totalPages,
      totalViews: data.totalViews,
      avgViewsPerPage: data.avgViewsPerPage,
      indexSizeBytes: data.indexSizeBytes,
      statsTimestamp: data.statsTimestamp,
    };
  }
}
