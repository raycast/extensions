import { getPreferenceValues } from "@raycast/api";
import { parseShodanError, ShodanError } from "./errors";
import {
  ApiCredits,
  ApiInfo,
  DnsResolveResponse,
  DnsReverseResponse,
  InternetDBResponse,
  ShodanAlert,
  ShodanDomainInfo,
  ShodanExploitResponse,
  ShodanHost,
  ShodanProfile,
  ShodanSearchResponse,
} from "./types";

const SHODAN_API_BASE = "https://api.shodan.io";
const EXPLOITS_API_BASE = "https://exploits.shodan.io/api";
const INTERNETDB_API_BASE = "https://internetdb.shodan.io";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ShodanClient {
  private cachedCredits: ApiCredits | null = null;
  private lastCreditsCheck = 0;
  private readonly CREDITS_CACHE_TTL = 60000; // 1 minute

  // Cache for search results (10 most recent)
  private searchCache = new Map<string, CacheEntry<ShodanSearchResponse>>();
  private readonly SEARCH_CACHE_TTL = 1800000; // 30 minutes (increased to reduce API calls)
  private readonly MAX_SEARCH_CACHE_SIZE = 15;

  // Cache for host lookups
  private hostCache = new Map<string, CacheEntry<ShodanHost>>();
  private readonly HOST_CACHE_TTL = 1800000; // 30 minutes (increased to reduce API calls)
  private readonly MAX_HOST_CACHE_SIZE = 30;

  private get apiKey(): string {
    const preferences = getPreferenceValues<Preferences>();
    return preferences.apiKey;
  }

  private getCacheKey(
    endpoint: string,
    params?: Record<string, string | number>,
  ): string {
    const sortedParams = params
      ? Object.entries(params)
          .sort()
          .map(([k, v]) => `${k}=${v}`)
          .join("&")
      : "";
    return `${endpoint}${sortedParams ? "?" + sortedParams : ""}`;
  }

  private getFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    ttl: number,
  ): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setInCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    maxSize: number,
  ): void {
    // Remove oldest entry if cache is full
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    cache.set(key, { data, timestamp: Date.now() });
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestOptions = {},
    retries = 1, // Reduced from 2 to 1 retry to avoid rate limiting
  ): Promise<T> {
    const { method = "GET", body } = options;

    const url = new URL(
      endpoint.startsWith("http") ? endpoint : `${SHODAN_API_BASE}${endpoint}`,
    );
    url.searchParams.set("key", this.apiKey);

    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchOptions);

        let data: unknown;
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }

        if (!response.ok) {
          const error = parseShodanError(response.status, data);

          // NEVER retry on these errors
          if (
            error.name === "AuthenticationError" ||
            error.name === "InsufficientCreditsError" ||
            error.name === "RateLimitError"
          ) {
            // For rate limit errors, try to extract retry-after header
            if (error.name === "RateLimitError") {
              const retryAfter = response.headers.get("retry-after");
              if (retryAfter) {
                const retryAfterSeconds = parseInt(retryAfter, 10);
                if (!isNaN(retryAfterSeconds)) {
                  throw new Error(
                    `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before trying again.`,
                  );
                }
              }
            }
            throw error;
          }

          // For other errors, only retry if it's a network/server error (5xx)
          if (response.status >= 500) {
            lastError = error;
            if (attempt < retries) {
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, attempt) * 1000),
              );
              continue;
            }
          }

          throw error;
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on these specific errors
        if (
          lastError.name === "AuthenticationError" ||
          lastError.name === "InsufficientCreditsError" ||
          lastError.name === "RateLimitError" ||
          lastError.message.includes("Rate limit exceeded")
        ) {
          throw lastError;
        }

        // Only retry on network errors
        if (
          attempt < retries &&
          (lastError.message.includes("fetch") ||
            lastError.message.includes("network"))
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1500),
          );
        } else {
          throw lastError;
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    // Temporarily disable retry to avoid rate limiting issues
    return this.requestWithRetry<T>(endpoint, options, 0);
  }

  // Account & Credits
  async getApiInfo(): Promise<ApiInfo> {
    return this.request<ApiInfo>("/api-info");
  }

  async getCredits(forceRefresh = false): Promise<ApiCredits> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cachedCredits &&
      now - this.lastCreditsCheck < this.CREDITS_CACHE_TTL
    ) {
      return this.cachedCredits;
    }

    const info = await this.getApiInfo();
    this.cachedCredits = {
      queryCredits: info.query_credits,
      scanCredits: info.scan_credits,
      monitorCredits: info.monitored_ips,
      plan: info.plan,
    };
    this.lastCreditsCheck = now;

    return this.cachedCredits;
  }

  async getProfile(): Promise<ShodanProfile> {
    return this.request<ShodanProfile>("/account/profile");
  }

  async getMyIP(): Promise<string> {
    return this.request<string>("/tools/myip");
  }

  // Search
  async search(
    query: string,
    page = 1,
    useCache = true,
  ): Promise<ShodanSearchResponse> {
    const cacheKey = this.getCacheKey("/shodan/host/search", { query, page });

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(
        this.searchCache,
        cacheKey,
        this.SEARCH_CACHE_TTL,
      );
      if (cached) return cached;
    }

    const url = `/shodan/host/search?query=${encodeURIComponent(query)}&page=${page}`;
    const result = await this.request<ShodanSearchResponse>(url);

    // Cache the result
    this.setInCache(
      this.searchCache,
      cacheKey,
      result,
      this.MAX_SEARCH_CACHE_SIZE,
    );

    return result;
  }

  async searchCount(
    query: string,
  ): Promise<{ total: number; facets: Record<string, unknown> }> {
    const url = `/shodan/host/count?query=${encodeURIComponent(query)}`;
    return this.request<{ total: number; facets: Record<string, unknown> }>(
      url,
    );
  }

  // Host
  async hostLookup(
    ip: string,
    history = false,
    minify = false,
    useCache = true,
  ): Promise<ShodanHost> {
    const cacheKey = this.getCacheKey(`/shodan/host/${ip}`, {
      history: history ? 1 : 0,
      minify: minify ? 1 : 0,
    });

    // Check cache first (only for non-history requests)
    if (useCache && !history) {
      const cached = this.getFromCache(
        this.hostCache,
        cacheKey,
        this.HOST_CACHE_TTL,
      );
      if (cached) return cached;
    }

    let url = `/shodan/host/${ip}`;
    const params = new URLSearchParams();
    if (history) params.set("history", "true");
    if (minify) params.set("minify", "true");
    if (params.toString()) url += `?${params.toString()}`;

    const result = await this.request<ShodanHost>(url);

    // Cache the result (only for non-history requests)
    if (!history) {
      this.setInCache(
        this.hostCache,
        cacheKey,
        result,
        this.MAX_HOST_CACHE_SIZE,
      );
    }

    return result;
  }

  // DNS
  async dnsResolve(hostnames: string[]): Promise<DnsResolveResponse> {
    const url = `/dns/resolve?hostnames=${hostnames.join(",")}`;
    return this.request<DnsResolveResponse>(url);
  }

  async dnsReverse(ips: string[]): Promise<DnsReverseResponse> {
    const url = `/dns/reverse?ips=${ips.join(",")}`;
    return this.request<DnsReverseResponse>(url);
  }

  async domainInfo(domain: string): Promise<ShodanDomainInfo> {
    return this.request<ShodanDomainInfo>(`/dns/domain/${domain}`);
  }

  // Exploits
  async searchExploits(
    query: string,
    page = 1,
  ): Promise<ShodanExploitResponse> {
    const url = `${EXPLOITS_API_BASE}/search?query=${encodeURIComponent(query)}&page=${page}&key=${this.apiKey}`;
    return this.request<ShodanExploitResponse>(url);
  }

  async countExploits(query: string): Promise<{ total: number }> {
    const url = `${EXPLOITS_API_BASE}/count?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
    return this.request<{ total: number }>(url);
  }

  // Alerts
  async getAlerts(): Promise<ShodanAlert[]> {
    return this.request<ShodanAlert[]>("/shodan/alert/info");
  }

  async getAlert(id: string): Promise<ShodanAlert> {
    return this.request<ShodanAlert>(`/shodan/alert/${id}/info`);
  }

  async createAlert(
    name: string,
    ips: string[],
    expires?: number,
  ): Promise<ShodanAlert> {
    return this.request<ShodanAlert>("/shodan/alert", {
      method: "POST",
      body: { name, filters: { ip: ips }, expires },
    });
  }

  async deleteAlert(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/shodan/alert/${id}`, {
      method: "DELETE",
    });
  }

  // Honeyscore - check if IP is a honeypot (Labs endpoint)
  async getHoneyscore(ip: string): Promise<number> {
    return this.request<number>(`/labs/honeyscore/${ip}`);
  }

  // InternetDB - free IP lookup (no API key required, no credits consumed)
  async getInternetDB(ip: string): Promise<InternetDBResponse> {
    const response = await fetch(`${INTERNETDB_API_BASE}/${ip}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No information available for this IP address.");
      }
      throw new Error(`InternetDB request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Utility to check if API key is valid
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getApiInfo();
      return true;
    } catch (error) {
      if (error instanceof ShodanError) {
        return false;
      }
      throw error;
    }
  }
}

// Singleton instance
export const shodanClient = new ShodanClient();
