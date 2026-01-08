import { getPreferenceValues } from "@raycast/api";
import { parseShodanError, ShodanError } from "./errors";
import {
  ApiCredits,
  ApiInfo,
  DnsResolveResponse,
  DnsReverseResponse,
  Preferences,
  ShodanAlert,
  ShodanDomainInfo,
  ShodanExploitResponse,
  ShodanHost,
  ShodanProfile,
  ShodanSearchResponse,
} from "./types";

const SHODAN_API_BASE = "https://api.shodan.io";
const EXPLOITS_API_BASE = "https://exploits.shodan.io/api";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
}

class ShodanClient {
  private cachedCredits: ApiCredits | null = null;
  private lastCreditsCheck = 0;
  private readonly CREDITS_CACHE_TTL = 60000; // 1 minute

  private get apiKey(): string {
    const preferences = getPreferenceValues<Preferences>();
    return preferences.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
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
      throw parseShodanError(response.status, data);
    }

    return data as T;
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
  async search(query: string, page = 1): Promise<ShodanSearchResponse> {
    const url = `/shodan/host/search?query=${encodeURIComponent(query)}&page=${page}`;
    return this.request<ShodanSearchResponse>(url);
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
  ): Promise<ShodanHost> {
    let url = `/shodan/host/${ip}`;
    const params = new URLSearchParams();
    if (history) params.set("history", "true");
    if (minify) params.set("minify", "true");
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<ShodanHost>(url);
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
