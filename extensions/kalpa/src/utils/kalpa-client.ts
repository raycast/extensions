/**
 * Kalpa API Client
 * Handles all communication with the Kalpa Convex backend
 * Includes timeout, retry with exponential backoff, and user-friendly error handling
 */

import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { ensureValidTokenOrToast, getApiToken } from "./auth";
import type {
  KalpaPreferences,
  KalpaLink,
  KalpaUniverse,
  KalpaTag,
  PaginatedResponse,
  SaveLinkRequest,
  SaveLinkResponse,
  LinkSearchOptions,
} from "../types";

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 5000;
// Default retry attempts
const DEFAULT_RETRIES = 3;
// Base backoff delay in milliseconds
const BASE_BACKOFF_MS = 300;

// Hardcoded production URLs
const CONVEX_URL = "https://convex.usekalpa.com";
const KALPA_APP_URL = "https://usekalpa.com";

class KalpaClient {
  private convexUrl: string;
  private apiToken: string;
  private kalpaAppUrl: string;
  private timeout: number;

  constructor() {
    const prefs = getPreferenceValues<KalpaPreferences>();
    this.convexUrl = CONVEX_URL;
    this.apiToken = prefs.apiToken;
    this.kalpaAppUrl = KALPA_APP_URL;
    this.timeout = DEFAULT_TIMEOUT;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getApiToken() || this.apiToken;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = this.timeout): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with retry and exponential backoff
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = DEFAULT_RETRIES): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          // Exponential backoff: 300ms, 600ms, 1200ms...
          const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - show user-friendly error
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection Failed",
      message: `Could not reach Kalpa after ${retries + 1} attempts`,
      primaryAction: {
        title: "Open Kalpa Web App",
        onAction: () => open(this.kalpaAppUrl),
      },
    });

    throw lastError || new Error("Connection failed");
  }

  /**
   * Execute a query via Next.js API route
   */
  private async query<T>(apiPath: string, args: Record<string, unknown> = {}): Promise<T> {
    const token = await ensureValidTokenOrToast();
    if (!token) {
      throw new Error("Authentication required");
    }

    const url = `${this.kalpaAppUrl}/api/${apiPath}`;

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Query failed (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.details || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Show specific error for auth issues
      if (response.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Required",
          message: "Please update your API Token in extension preferences",
        });
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Execute a Convex mutation via HTTP
   */
  private async mutation<T>(functionPath: string, args: Record<string, unknown> = {}): Promise<T> {
    const token = await ensureValidTokenOrToast();
    if (!token) {
      throw new Error("Authentication required");
    }

    const url = `${this.convexUrl}/api/mutation`;

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        path: functionPath,
        args,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Mutation failed (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.details || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = (await response.json()) as { value: T };
    return result.value;
  }

  /**
   * Get links via Next.js API (uses first-user fallback)
   */
  async getLinks(options: LinkSearchOptions = {}): Promise<PaginatedResponse<KalpaLink>> {
    return this.linksQuery({
      universeId: options.universeId || undefined,
      hideRead: options.hideRead || false,
      hideArchived: options.hideArchived || false,
      numItems: options.numItems || 50,
    });
  }

  /**
   * Get YouTube videos
   */
  async getVideos(options: LinkSearchOptions = {}): Promise<PaginatedResponse<KalpaLink>> {
    return this.linksQuery({
      universeId: options.universeId || undefined,
      hideRead: options.hideRead || false,
      hideArchived: options.hideArchived || false,
      numItems: options.numItems || 50,
      linkType: "video",
    });
  }

  /**
   * Get CodePen links
   */
  async getCodepenLinks(numItems = 50, universeId?: string): Promise<PaginatedResponse<KalpaLink>> {
    return this.linksQuery({
      numItems,
      linkType: "codepen",
      universeId: universeId || undefined,
    });
  }

  /**
   * Query links via Convex HTTP endpoint with JWT auth (multi-user support)
   */
  private async linksQuery<T>(args: Record<string, unknown> = {}): Promise<T> {
    const token = await ensureValidTokenOrToast();
    if (!token) {
      throw new Error("Authentication required");
    }

    // Self-hosted Convex serves HTTP actions at /http/<path>
    const url = `${this.convexUrl}/http/links-list`;

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Links query failed: ${errorText}`);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Get a single link by ID
   */
  async getLink(linkId: string): Promise<KalpaLink | null> {
    return this.query<KalpaLink | null>("links", { linkId });
  }

  /**
   * Get user's universes via Convex HTTP endpoint with JWT auth (multi-user support)
   */
  async getUniverses(): Promise<KalpaUniverse[]> {
    const token = await ensureValidTokenOrToast();
    if (!token) {
      throw new Error("Authentication required");
    }

    // Self-hosted Convex serves HTTP actions at /http/<path>
    const url = `${this.convexUrl}/http/universes-list`;

    const response = await this.fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Query failed (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.details || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      if (response.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Required",
          message: "Please update your API Token in extension preferences",
        });
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as { universes?: KalpaUniverse[] };
    return data.universes ?? [];
  }

  /**
   * Get user's tags
   */
  async getTags(contentType?: "links" | "videos"): Promise<KalpaTag[]> {
    return this.query<KalpaTag[]>("tags:getUserTags", {
      contentType: contentType || undefined,
    });
  }

  /**
   * Save a link to Kalpa via HTTP endpoint
   */
  async saveLink(request: SaveLinkRequest): Promise<SaveLinkResponse> {
    const token = await ensureValidTokenOrToast();
    if (!token) {
      throw new Error("Authentication required");
    }

    const url = `${this.kalpaAppUrl}/api/save`;

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to save link (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.details || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      if (response.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Required",
          message: "Please update your API Token in extension preferences",
        });
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as SaveLinkResponse;
  }

  /**
   * Mark a link as read/unread
   */
  async toggleRead(linkId: string): Promise<void> {
    await this.mutation("links:markAsRead", { linkId });
  }

  /**
   * Toggle archive status
   */
  async toggleArchive(linkId: string): Promise<void> {
    await this.mutation("links:toggleArchive", { linkId });
  }

  /**
   * Assign link to universe
   */
  async assignToUniverse(linkId: string, universeId: string): Promise<void> {
    await this.mutation("universes:assignLinkToUniverse", { linkId, universeId });
  }

  /**
   * Remove link from universe
   */
  async removeFromUniverse(linkId: string, universeId: string): Promise<void> {
    await this.mutation("universes:removeLinkFromUniverse", { linkId, universeId });
  }

  /**
   * Get the web app URL for a link
   */
  getLinkWebUrl(linkId: string): string {
    return `${this.kalpaAppUrl}/links/${linkId}`;
  }

  /**
   * Get the web app URL for a universe
   */
  getUniverseWebUrl(universeId: string): string {
    return `${this.kalpaAppUrl}/universes/${universeId}`;
  }

  /**
   * Get the inbox URL
   */
  getInboxUrl(): string {
    return `${this.kalpaAppUrl}/inbox`;
  }
}

// Singleton instance
let clientInstance: KalpaClient | null = null;

export function getKalpaClient(): KalpaClient {
  if (!clientInstance) {
    clientInstance = new KalpaClient();
  }
  return clientInstance;
}

// Reset client (useful when preferences change)
export function resetKalpaClient(): void {
  clientInstance = null;
}

export { KalpaClient };
