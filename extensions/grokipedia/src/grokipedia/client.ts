import { URL, URLSearchParams } from "url";
import fetch, { Response } from "node-fetch";
import {
  GrokipediaAPIError,
  GrokipediaBadRequestError,
  GrokipediaNotFoundError,
  GrokipediaRateLimitError,
  GrokipediaServerError,
  GrokipediaNetworkError,
  GrokipediaValidationError,
} from "./errors";
import { PageResponse, SearchResponse, ConstantsResponse, StatsResponse } from "./types";

interface GrokipediaClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
  retryBackoffFactor?: number;
  retryBackoffJitter?: boolean;
}

/**
 * GrokipediaClient - a small JS client that mirrors the Python SDK functionality.
 */
export class GrokipediaClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBackoffFactor: number;
  private readonly retryBackoffJitter: boolean;

  constructor(options: GrokipediaClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://grokipedia.com";
    this.userAgent = options.userAgent || "Grokipedia JS SDK (Raycast)";
    this.timeout = typeof options.timeout === "number" ? options.timeout : 30000;
    this.maxRetries =
      typeof options.maxRetries === "number" && Number.isInteger(options.maxRetries) ? options.maxRetries : 3;
    this.retryBackoffFactor = typeof options.retryBackoffFactor === "number" ? options.retryBackoffFactor : 0.5;
    this.retryBackoffJitter = options.retryBackoffJitter !== false; // default true
  }

  private _headers() {
    return {
      "User-Agent": this.userAgent,
      Accept: "application/json",
    };
  }

  private _calculateBackoff(attempt: number): number {
    let backoff = this.retryBackoffFactor * Math.pow(2, attempt);
    if (this.retryBackoffJitter) {
      backoff += Math.random() * 0.1 * backoff;
    }
    return backoff * 1000; // convert to ms
  }

  private async _fetchWithRetries(url: string, fetchOptions: object = {}): Promise<Response> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        }

        const text = await response.text().catch(() => null);
        const status = response.status;
        if (attempt === this.maxRetries - 1) {
          this._handleHTTPError(status, text);
        }

        if (new Set([429, 500, 502, 503, 504]).has(status)) {
          const backoffMs = this._calculateBackoff(attempt);
          await new Promise((res) => setTimeout(res, backoffMs));
          continue;
        } else {
          this._handleHTTPError(status, text);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (attempt === this.maxRetries - 1) {
          throw new GrokipediaNetworkError(`Network error: ${(err as Error).message}`);
        }
        const backoffMs = this._calculateBackoff(attempt);
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }
    }

    throw new GrokipediaNetworkError(`Max retries (${this.maxRetries}) exceeded`);
  }

  private _handleHTTPError(status: number, body: string | null) {
    const msg = `HTTP error ${status}: ${body ?? ""}`;
    if (status === 400) throw new GrokipediaBadRequestError(msg, status, body);
    if (status === 404) throw new GrokipediaNotFoundError(msg, status, body);
    if (status === 429) throw new GrokipediaRateLimitError(msg, status, body);
    if (status >= 500 && status < 600) throw new GrokipediaServerError(msg, status, body);
    throw new GrokipediaAPIError(msg, status, body);
  }

  private async _parseJsonResponse(response: Response) {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (err) {
      throw new GrokipediaValidationError(`Failed to parse JSON response: ${(err as Error).message}`);
    }
  }

  private _buildUrl(path: string, params: Record<string, string> | null = null): string {
    const url = new URL(path, this.baseUrl);
    if (params && Object.keys(params).length > 0) {
      url.search = new URLSearchParams(params).toString();
    }
    return url.toString();
  }

  async search(query: string, limit = 12, offset = 0): Promise<SearchResponse> {
    const url = this._buildUrl("/api/full-text-search", { query, limit: String(limit), offset: String(offset) });
    const res = await this._fetchWithRetries(url, { method: "GET", headers: this._headers() });
    const json = await this._parseJsonResponse(res);
    if (!json || !Array.isArray(json.results)) {
      throw new GrokipediaValidationError("Invalid search response");
    }
    return json;
  }

  async getPage(slug: string, includeContent = true, validateLinks = false): Promise<PageResponse> {
    const params = {
      slug,
      includeContent: String(includeContent).toLowerCase(),
      validateLinks: String(validateLinks).toLowerCase(),
    };
    const url = this._buildUrl("/api/page", params);
    const res = await this._fetchWithRetries(url, { method: "GET", headers: this._headers() });
    const json = await this._parseJsonResponse(res);
    if (json && json.page) {
      json.page.citations = json.page.citations ?? [];
      json.page.images = json.page.images ?? [];
      json.page.fixedIssues = json.page.fixedIssues ?? [];
      json.page.metadata = json.page.metadata ?? {};
      json.page.stats = json.page.stats ?? {};
      json.page.linkedPages = json.page.linkedPages ?? [];
    }
    return json;
  }

  async getConstants(): Promise<ConstantsResponse> {
    const url = this._buildUrl("/api/constants");
    const res = await this._fetchWithRetries(url, { method: "GET", headers: this._headers() });
    return this._parseJsonResponse(res);
  }

  async getStats(): Promise<StatsResponse> {
    const url = this._buildUrl("/api/stats");
    const res = await this._fetchWithRetries(url, { method: "GET", headers: this._headers() });
    return this._parseJsonResponse(res);
  }
}
