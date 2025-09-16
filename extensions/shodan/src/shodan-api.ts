import { getPreferenceValues } from "@raycast/api";

export interface ShodanPortInfo {
  port: number;
  product?: string;
  version?: string;
  banner?: string;
  data?: string; // The actual banner/header data
  cpe?: string[];
  vulns?: string[];
  timestamp?: string;
  transport?: string; // TCP, UDP, etc.
  hostname?: string;
  os?: string;
}

export interface ShodanHostInfo {
  ip_str: string;
  port: number;
  hostnames: string[];
  os: string | null;
  timestamp: string;
  last_update?: string; // The actual timestamp field
  data: string;
  data_array?: ShodanPortInfo[]; // Optional data_array
  org: string;
  isp: string;
  country_name: string;
  country_code: string;
  region_code: string;
  city: string;
  latitude: number;
  longitude: number;
  vulns: string[];
  tags: string[];
  product: string;
  version: string;
  cpe: string[];
  title: string;
  html: string;
  ports: number[];
  location: {
    country_name: string;
    country_code: string;
    region_code: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface ShodanSearchResult {
  matches: ShodanHostInfo[];
  total: number;
  facets: Record<string, Array<{ count: number; value: string }>>;
}

export interface ShodanScreenshot {
  data: string; // base64 encoded image data
  timestamp?: string;
}

export interface ShodanSearchHostInfo extends ShodanHostInfo {
  screenshot?: ShodanScreenshot;
  _shodan?: {
    id: string;
    module: string;
    options: Record<string, unknown>;
  };
}

export interface ShodanAPIInfo {
  scan_credits: number;
  usage_limits: {
    scan_credits: number;
    query_credits: number;
    monitored_ips: number;
  };
  plan: string;
  https: boolean;
  unlocked: boolean;
  query_credits: number;
  monitored_ips: number;
  unlocked_left: number;
  telnet: boolean;
}

export interface ShodanStatsResult {
  total: number;
  facets: Record<string, Array<{ count: number; value: string }>>;
}

export interface ShodanScanRequest {
  ips: string; // Comma-separated list of IPs or netblocks
  service: Array<[number, string]>; // Array of [port, protocol] pairs
}

export interface ShodanScanResponse {
  id: string;
  count: number;
  status: string;
  created: string;
  created_timestamp: number;
  credits_left: number;
  request: {
    ips: string;
    service: Array<[number, string]>;
  };
}

export interface ShodanScanStatus {
  id: string;
  status: string;
  count: number;
  created: string;
  created_timestamp: number;
  credits_left: number;
  request: {
    ips: string;
    service: Array<[number, string]>;
  };
}

export interface ShodanScanResult {
  matches: ShodanHostInfo[];
  total: number;
  scan_id: string;
}

export interface ShodanAlertInfo {
  id: string;
  name: string;
  created: string; // ISO timestamp string
  triggers: Record<string, Record<string, unknown>>;
  has_triggers: boolean;
  expires: number; // 0 means no expiration
  expiration: string | null;
  filters: {
    ip: string[];
  };
  notifiers: Array<{
    description: string | null;
    args: Record<string, unknown>;
    provider: string;
    id: string;
  }>;
  size: number;
}

export class ShodanAPI {
  private apiKey: string;
  private baseUrl = "https://api.shodan.io";

  constructor() {
    const preferences = getPreferenceValues<{ shodanApiKey: string }>();
    this.apiKey = preferences.shodanApiKey;
  }

  async searchHost(query: string): Promise<ShodanHostInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/shodan/host/${encodeURIComponent(query)}?key=${this.apiKey}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Host not found
        }
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanHostInfo;
    } catch (error) {
      console.error("Error searching host:", error);
      throw new Error(`Failed to search host: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async search(query: string, page = 1): Promise<ShodanSearchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/shodan/host/search?key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}`,
      );

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanSearchResult;
    } catch (error) {
      console.error("Error searching:", error);
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async searchWithCriteria(query: string, page = 1, facets?: string[]): Promise<ShodanSearchResult> {
    try {
      let url = `${this.baseUrl}/shodan/host/search?key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}`;

      if (facets && facets.length > 0) {
        url += `&facets=${facets.join(",")}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanSearchResult;
    } catch (error) {
      console.error("Error searching with criteria:", error);
      throw new Error(`Failed to search with criteria: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getAPIInfo(): Promise<ShodanAPIInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api-info?key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanAPIInfo;
    } catch (error) {
      console.error("Error getting API info:", error);
      throw new Error(`Failed to get API info: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getStats(query: string, facets: string[] = ["country", "org"]): Promise<ShodanStatsResult> {
    try {
      const facetsParam = facets.join(",");
      const response = await fetch(
        `${this.baseUrl}/shodan/host/search?key=${this.apiKey}&query=${encodeURIComponent(query)}&facets=${facetsParam}`,
      );

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanStatsResult;
    } catch (error) {
      console.error("Error getting stats:", error);
      throw new Error(`Failed to get stats: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async requestScan(scanRequest: ShodanScanRequest): Promise<ShodanScanResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/shodan/scan?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scanRequest),
      });

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanScanResponse;
    } catch (error) {
      console.error("Error requesting scan:", error);
      throw new Error(`Failed to request scan: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getScanStatus(scanId: string): Promise<ShodanScanStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/shodan/scan/${scanId}?key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as ShodanScanStatus;
    } catch (error) {
      console.error("Error getting scan status:", error);
      throw new Error(`Failed to get scan status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getScanResults(scanId: string, page = 1): Promise<ShodanScanResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/shodan/host/search?key=${this.apiKey}&query=scan:${scanId}&page=${page}`,
      );

      if (!response.ok) {
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { matches: ShodanHostInfo[]; total: number };
      return {
        matches: data.matches,
        total: data.total,
        scan_id: scanId,
      };
    } catch (error) {
      console.error("Error getting scan results:", error);
      throw new Error(`Failed to get scan results: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getAlertInfo(): Promise<ShodanAlertInfo[]> {
    try {
      console.log("🔍 Fetching alert info from Shodan API...");
      console.log("🔑 API Key present:", !!this.apiKey);
      console.log("🌐 API URL:", `${this.baseUrl}/shodan/alert/info?key=${this.apiKey ? "[REDACTED]" : "MISSING"}`);
      const startTime = Date.now();

      const response = await fetch(`${this.baseUrl}/shodan/alert/info?key=${this.apiKey}`);

      console.log("📡 Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Shodan API error:", {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
          url: `${this.baseUrl}/shodan/alert/info?key=${this.apiKey ? "[REDACTED]" : "MISSING"}`,
        });
        throw new Error(`Shodan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fetchTime = Date.now() - startTime;

      console.log("📊 Raw response data:", data);
      console.log("📊 Data type:", typeof data);
      console.log("📊 Is array:", Array.isArray(data));
      console.log("📊 Data keys:", data ? Object.keys(data) : "null/undefined");

      console.log("✅ Alert info fetched successfully:", {
        alertCount: Array.isArray(data) ? data.length : 0,
        fetchTime: `${fetchTime}ms`,
        responseSize: JSON.stringify(data).length,
        dataStructure: data,
      });

      return data as ShodanAlertInfo[];
    } catch (error) {
      console.error("❌ Error getting alert info:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
      });
      throw new Error(`Failed to get alert info: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
