import axios, { AxiosInstance, AxiosError } from "axios";
import {
  ClashConfig,
  ClashMode,
  ProxiesResponse,
  DelayResult,
  ConnectionsResponse,
  Version,
  ApiError,
} from "./types";
import { getClashApiConfig, isAutoCloseConnectionEnabled } from "./config";

/**
 * Default test URL for proxy delay testing
 * Uses Cloudflare's generate_204 endpoint which returns an empty response with 204 status
 */
const DEFAULT_TEST_URL = "https://cp.cloudflare.com/generate_204";

/**
 * Clash API client class
 */
export class ClashApi {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private secret?: string;

  constructor() {
    const config = getClashApiConfig();
    this.baseUrl = config.url;
    this.secret = config.secret;

    console.log("Clash API configuration:", {
      url: this.baseUrl,
      hasSecret: !!this.secret,
    });

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        ...(this.secret && { Authorization: `Bearer ${this.secret}` }),
      },
    });

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        console.error("Clash API request failed:", error.message);
        throw this.handleApiError(error);
      },
    );
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiError;

      switch (status) {
        case 401:
          return new Error(
            "API authentication failed, please check secret settings",
          );
        case 404:
          return new Error("API endpoint does not exist");
        case 500:
          return new Error("Clash internal server error");
        default:
          return new Error(data?.message || `API request failed (${status})`);
      }
    } else if (error.request) {
      return new Error(
        "Unable to connect to Clash API, please check if Clash Verge Rev is running",
      );
    } else {
      return new Error(`Request configuration error: ${error.message}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getVersion();
      return true;
    } catch (error) {
      console.error("API connection test failed:", error);
      return false;
    }
  }

  /**
   * Get version information
   */
  async getVersion(): Promise<Version> {
    return this.axiosInstance.get("/version");
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<ClashConfig> {
    return this.axiosInstance.get("/configs");
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<ClashConfig>): Promise<void> {
    return this.axiosInstance.patch("/configs", config);
  }

  /**
   * Switch proxy mode
   */
  async switchMode(mode: ClashMode): Promise<void> {
    await this.updateConfig({ mode });

    // If auto close connections is enabled, close all connections
    if (isAutoCloseConnectionEnabled()) {
      await this.closeAllConnections();
    }
  }

  /**
   * Get proxy information
   */
  async getProxies(): Promise<ProxiesResponse> {
    return this.axiosInstance.get("/proxies");
  }

  /**
   * Switch proxy node
   */
  async switchProxy(groupName: string, proxyName: string): Promise<void> {
    await this.axiosInstance.put(`/proxies/${encodeURIComponent(groupName)}`, {
      name: proxyName,
    });

    // If auto close connections is enabled, close related connections
    if (isAutoCloseConnectionEnabled()) {
      await this.closeConnectionsByChain(groupName);
    }
  }

  /**
   * Test proxy delay
   */
  async testProxyDelay(
    proxyName: string,
    timeout = 10000,
    url = DEFAULT_TEST_URL,
  ): Promise<DelayResult> {
    return this.axiosInstance.get(
      `/proxies/${encodeURIComponent(proxyName)}/delay`,
      {
        params: {
          timeout,
          url,
        },
      },
    );
  }

  /**
   * Get connection information
   */
  async getConnections(): Promise<ConnectionsResponse> {
    return this.axiosInstance.get("/connections");
  }

  /**
   * Close specified connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    return this.axiosInstance.delete(`/connections/${connectionId}`);
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    return this.axiosInstance.delete("/connections");
  }

  /**
   * Close connections for specified proxy chain
   */
  async closeConnectionsByChain(chainName: string): Promise<void> {
    try {
      const connections = await this.getConnections();
      const targetConnections = connections.connections.filter((conn) =>
        conn.chains.includes(chainName),
      );

      await Promise.all(
        targetConnections.map((conn) => this.closeConnection(conn.id)),
      );
    } catch (error) {
      console.error(
        "Failed to close connections for specified proxy chain:",
        error,
      );
    }
  }

  /**
   * Batch test proxy delays
   */
  async batchTestDelay(
    proxyNames: string[],
    timeout = 10000,
    url = DEFAULT_TEST_URL,
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    // Concurrent testing, but limit concurrency to avoid overload
    const concurrency = 5;
    const chunks = [];

    for (let i = 0; i < proxyNames.length; i += concurrency) {
      chunks.push(proxyNames.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (name) => {
        try {
          const result = await this.testProxyDelay(name, timeout, url);
          results[name] = result.delay;
        } catch (error) {
          console.error(`Failed to test proxy ${name} delay:`, error);
          results[name] = -1; // Indicates test failure
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get current mode
   */
  async getCurrentMode(): Promise<ClashMode> {
    const config = await this.getConfig();
    return config.mode;
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    version?: string;
    mode?: ClashMode;
    error?: string;
  }> {
    try {
      const [version, config] = await Promise.all([
        this.getVersion(),
        this.getConfig(),
      ]);

      return {
        isHealthy: true,
        version: version.version,
        mode: config.mode,
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Singleton instance
let clashApiInstance: ClashApi | null = null;

/**
 * Get Clash API instance
 */
export function getClashApi(): ClashApi {
  if (!clashApiInstance) {
    clashApiInstance = new ClashApi();
  }
  return clashApiInstance;
}

/**
 * Reset API instance (for use after configuration changes)
 */
export function resetClashApi(): void {
  clashApiInstance = null;
}

/**
 * Format delay display
 */
export function formatDelay(delay: number): string {
  if (delay === -1) return "Timeout";
  if (delay === -2) return "Testing";
  if (delay <= 0) return "Error";
  return `${delay}ms`;
}

/**
 * Get delay color
 */
export function getDelayColor(delay: number): string {
  if (delay === -1 || delay === -2 || delay <= 0) return "🔴";
  if (delay < 100) return "🟢";
  if (delay < 300) return "🟡";
  return "🔴";
}
