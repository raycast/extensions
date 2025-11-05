import { GraphQLClient } from "graphql-request";
import { getPreferenceValues } from "@raycast/api";
import { ResourceListItem } from "../types.js";
import { DebugLogger } from "../utils/debug";
import { MOCK_RESOURCES } from "./mock-resources";

// Enhanced error types for better error handling
export enum TwingateErrorType {
  AUTHENTICATION = "authentication",
  NETWORK = "network",
  API_LIMIT = "api_limit",
  TIMEOUT = "timeout",
  INVALID_RESPONSE = "invalid_response",
  UNKNOWN = "unknown",
}

export class TwingateError extends Error {
  constructor(
    public type: TwingateErrorType,
    public message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "TwingateError";
  }
}

const RESOURCES_QUERY = `
  query Resources($first: Int, $after: String) {
    resources(first: $first, after: $after) {
      edges {
        node {
          id
          name
          address {
            value
          }
          alias
          remoteNetwork {
            name
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export class TwingateApi {
  private client: GraphQLClient;
  private preferences: Preferences;
  private requestCount = 0;

  constructor() {
    this.preferences = getPreferenceValues<Preferences>();

    DebugLogger.debug("TwingateApi constructor called", {
      networkUrl: this.preferences.networkUrl,
      hasApiKey: !!this.preferences.apiKey,
    });

    // Demo mode: use mock data when networkUrl indicates demo
    const isDemoMode =
      typeof this.preferences.networkUrl === "string" &&
      (this.preferences.networkUrl.toLowerCase() === "demo" ||
        this.preferences.networkUrl.toLowerCase().startsWith("demo://"));

    DebugLogger.info("Environment", { isDemoMode });

    if (isDemoMode) {
      // Create a no-op client to keep types happy; real fetches aren't used.
      this.client = new GraphQLClient("https://demo.invalid/");
      return;
    }

    // Validate preferences
    if (!this.preferences.apiKey) {
      const error = new TwingateError(
        TwingateErrorType.AUTHENTICATION,
        "API key is required. Please configure your Twingate API key in preferences.",
      );
      DebugLogger.error("API key validation failed", error);
      throw error;
    }

    if (!this.preferences.networkUrl) {
      const error = new TwingateError(
        TwingateErrorType.NETWORK,
        "Network URL is required. Please configure your Twingate network URL in preferences.",
      );
      DebugLogger.error("Network URL validation failed", error);
      throw error;
    }

    // Ensure networkUrl ends with /api/graphql/
    const baseUrl = this.preferences.networkUrl.replace(/\/$/, "");
    const apiUrl = `${baseUrl}/api/graphql/`;

    DebugLogger.debug("GraphQL client configuration", {
      baseUrl,
      apiUrl,
      timeout: "10000ms",
    });

    this.client = new GraphQLClient(apiUrl, {
      headers: {
        "X-API-KEY": this.preferences.apiKey,
        "Content-Type": "application/json",
      },
      fetch: (url: string | URL, options?: RequestInit) => {
        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const requestId = ++this.requestCount;
        const startTime = Date.now();

        DebugLogger.debug(`API request #${requestId} started`, {
          url: url.toString(),
          method: options?.method || "POST",
          timeout: "10000ms",
          headers: options?.headers
            ? Object.keys(options.headers as Record<string, string>)
            : [],
        });

        return fetch(url, {
          ...options,
          signal: controller.signal,
        })
          .then((response) => {
            const duration = Date.now() - startTime;
            DebugLogger.debug(`API request #${requestId} completed`, {
              status: response.status,
              statusText: response.statusText,
              duration: `${duration}ms`,
              ok: response.ok,
              headers: response.headers ? "present" : "missing",
            });
            return response;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            DebugLogger.error(`API request #${requestId} failed`, {
              error: error.message,
              duration: `${duration}ms`,
              name: error.name,
            });
            throw error;
          })
          .finally(() => clearTimeout(timeoutId));
      },
    });
  }

  async getAllResources(): Promise<ResourceListItem[]> {
    const startTime = Date.now();
    DebugLogger.info("getAllResources() called");

    try {
      // Return mock data in demo mode
      const isDemoMode =
        typeof this.preferences.networkUrl === "string" &&
        (this.preferences.networkUrl.toLowerCase() === "demo" ||
          this.preferences.networkUrl.toLowerCase().startsWith("demo://"));
      if (isDemoMode) {
        DebugLogger.info("Returning mock resources for demo mode", {
          count: MOCK_RESOURCES.length,
        });
        return MOCK_RESOURCES;
      }

      const allResources: ResourceListItem[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;
      let pageCount = 0;

      while (hasNextPage) {
        pageCount++;
        const pageStartTime = Date.now();

        DebugLogger.debug(`Fetching page ${pageCount}`, {
          cursor,
          first: 100,
        });

        const data = (await this.client.request(RESOURCES_QUERY, {
          first: 100,
          after: cursor,
        })) as {
          resources: {
            edges: Array<{
              node: {
                id: string;
                name: string;
                address: { value: string };
                alias?: string;
                remoteNetwork: { name: string };
              };
              cursor: string;
            }>;
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string;
            };
          };
        };

        const pageDuration = Date.now() - pageStartTime;
        DebugLogger.debug(`Page ${pageCount} response received`, {
          duration: `${pageDuration}ms`,
          resourceCount: data.resources.edges.length,
          hasNextPage: data.resources.pageInfo.hasNextPage,
          endCursor: data.resources.pageInfo.endCursor,
        });

        const resources = data.resources.edges.map((edge) => {
          const addressOrAlias = edge.node.alias || edge.node.address.value;
          return {
            id: edge.node.id,
            name: edge.node.name,
            address: edge.node.address.value,
            alias: edge.node.alias,
            networkName: edge.node.remoteNetwork.name,
            url: this.buildResourceUrl(addressOrAlias),
          };
        });

        allResources.push(...resources);
        hasNextPage = data.resources.pageInfo.hasNextPage;
        cursor = data.resources.pageInfo.endCursor;

        DebugLogger.debug(`Page ${pageCount} processed`, {
          newResourceCount: resources.length,
          totalResourceCount: allResources.length,
          hasNextPage,
        });
      }

      const totalDuration = Date.now() - startTime;
      DebugLogger.info("getAllResources() completed successfully", {
        totalResourceCount: allResources.length,
        totalPages: pageCount,
        totalDuration: `${totalDuration}ms`,
        averagePageDuration: `${Math.round(totalDuration / pageCount)}ms`,
      });

      return allResources;
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      DebugLogger.error("getAllResources() failed", {
        error: error instanceof Error ? error.message : String(error),
        duration: `${totalDuration}ms`,
        originalError: error,
      });
      throw this.handleApiError(error);
    }
  }

  private buildResourceUrl(addressOrAlias: string): string {
    // Check if the address already includes a protocol
    if (
      addressOrAlias.startsWith("http://") ||
      addressOrAlias.startsWith("https://")
    ) {
      return addressOrAlias;
    }

    // Default to HTTP for all resources (aliases, IP addresses, and other formats)
    return `http://${addressOrAlias}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.request(
        `query TestConnection {
          resources(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }`,
      );
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  private handleApiError(error: unknown): TwingateError {
    DebugLogger.debug("handleApiError() called", { error });

    if (error instanceof Error) {
      // Handle timeout errors
      if (error.name === "AbortError") {
        const twingateError = new TwingateError(
          TwingateErrorType.TIMEOUT,
          "Request timed out. Please check your network connection and try again.",
          error,
        );
        DebugLogger.error("Timeout error detected", { originalError: error });
        return twingateError;
      }

      // Handle authentication errors
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        const twingateError = new TwingateError(
          TwingateErrorType.AUTHENTICATION,
          "Invalid API key. Please check your Twingate API key in preferences.",
          error,
        );
        DebugLogger.error("Authentication error detected", {
          originalError: error,
        });
        return twingateError;
      }

      // Handle network errors
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ECONNREFUSED")
      ) {
        const twingateError = new TwingateError(
          TwingateErrorType.NETWORK,
          "Cannot connect to Twingate network. Please verify your network URL is correct.",
          error,
        );
        DebugLogger.error("Network error detected", { originalError: error });
        return twingateError;
      }

      // Handle rate limiting
      if (
        error.message.includes("429") ||
        error.message.includes("Too Many Requests")
      ) {
        const twingateError = new TwingateError(
          TwingateErrorType.API_LIMIT,
          "API rate limit exceeded. Please wait a moment and try again.",
          error,
        );
        DebugLogger.error("Rate limit error detected", {
          originalError: error,
        });
        return twingateError;
      }

      // Handle GraphQL errors
      if (error.message.includes("GraphQL")) {
        const twingateError = new TwingateError(
          TwingateErrorType.INVALID_RESPONSE,
          "Invalid response from Twingate API. Please check your permissions.",
          error,
        );
        DebugLogger.error("GraphQL error detected", { originalError: error });
        return twingateError;
      }

      // Generic error with original message
      const twingateError = new TwingateError(
        TwingateErrorType.UNKNOWN,
        `Failed to fetch resources: ${error.message}`,
        error,
      );
      DebugLogger.error("Unknown error detected", { originalError: error });
      return twingateError;
    }

    // Unknown error type
    const twingateError = new TwingateError(
      TwingateErrorType.UNKNOWN,
      "An unknown error occurred while fetching resources.",
    );
    DebugLogger.error("Completely unknown error detected", {
      originalError: error,
    });
    return twingateError;
  }
}
