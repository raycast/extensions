import fetch, { RequestInit } from "node-fetch";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  PiHoleStatus,
  PiHoleQuery,
  PiHoleDomainList,
  PiHoleQueryResult,
  DisableOptions,
  ConnectionTestResult,
} from "../types/pihole";
import {
  sanitizeUrl,
  parseDuration,
  getConnectionTimeout,
} from "../utils/preferences";

interface AuthResponse {
  session: {
    valid: boolean;
    sid: string;
    csrf: string;
    validity: number;
    message: string;
  };
}

interface ExtendedRequestInit extends RequestInit {
  retryAttempted?: boolean;
}

interface SessionData {
  sessionId: string;
  csrfToken: string;
  sessionExpiry: number;
  baseUrl: string;
}

export class PiHoleAPI {
  private baseUrl: string;
  private apiToken: string;
  private timeout: number;
  private sessionId: string | null = null;
  private csrfToken: string | null = null;
  private sessionExpiry: number = 0;
  private authPromise: Promise<void> | null = null;
  private sessionFilePath: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = sanitizeUrl(baseUrl);
    this.apiToken = apiToken;
    this.timeout = getConnectionTimeout() * 1000;

    // Create session file path
    const cacheDir = join(homedir(), ".raycast", "pihole-sessions");
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    this.sessionFilePath = join(
      cacheDir,
      `session-${Buffer.from(baseUrl).toString("base64").slice(0, 10)}.json`,
    );

    // Load existing session
    this.loadSession();
  }

  private loadSession(): void {
    try {
      if (existsSync(this.sessionFilePath)) {
        const data = JSON.parse(
          readFileSync(this.sessionFilePath, "utf8"),
        ) as SessionData;

        // Only load if it's for the same URL and not expired
        if (data.baseUrl === this.baseUrl && Date.now() < data.sessionExpiry) {
          this.sessionId = data.sessionId;
          this.csrfToken = data.csrfToken;
          this.sessionExpiry = data.sessionExpiry;
        }
      }
    } catch {
      // Ignore errors loading session file
    }
  }

  private saveSession(): void {
    try {
      if (this.sessionId && this.csrfToken) {
        const data: SessionData = {
          sessionId: this.sessionId,
          csrfToken: this.csrfToken,
          sessionExpiry: this.sessionExpiry,
          baseUrl: this.baseUrl,
        };
        writeFileSync(this.sessionFilePath, JSON.stringify(data));
      }
    } catch {
      // Ignore errors saving session file
    }
  }

  private async authenticate(): Promise<void> {
    // If authentication is already in progress, wait for it
    if (this.authPromise) {
      return this.authPromise;
    }

    // If we have a valid session with more than 30 seconds remaining, don't re-authenticate
    if (this.sessionId && Date.now() < this.sessionExpiry - 30000) {
      return;
    }

    this.authPromise = this.performAuthentication();

    try {
      await this.authPromise;
    } finally {
      this.authPromise = null;
    }
  }

  private async performAuthentication(): Promise<void> {
    const url = `${this.baseUrl}/api/auth`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Raycast Pi-hole Extension",
        },
        body: JSON.stringify({ password: this.apiToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Too many login attempts. Please wait a moment before trying again.",
          );
        }
        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText}`,
        );
      }

      const authData = (await response.json()) as AuthResponse;

      if (!authData.session.valid) {
        throw new Error("Invalid authentication credentials");
      }

      this.sessionId = authData.session.sid;
      this.csrfToken = authData.session.csrf;
      // Set expiry to 80% of validity period to give more buffer time
      this.sessionExpiry = Date.now() + authData.session.validity * 1000 * 0.8;

      // Save session to file for persistence across commands
      this.saveSession();
    } catch (error) {
      clearTimeout(timeoutId);
      // Clear session data on auth failure
      this.sessionId = null;
      this.csrfToken = null;
      this.sessionExpiry = 0;

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Authentication request timed out");
      }
      throw error;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: ExtendedRequestInit = {},
  ): Promise<T> {
    // Simple delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Ensure we're authenticated
    if (!this.sessionId) {
      await this.authenticate();
    }

    // Add SID as URL parameter instead of header
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set("sid", this.sessionId!);

    const headers: Record<string, string> = {
      "User-Agent": "Raycast Pi-hole Extension",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add CSRF token for POST/PUT/DELETE requests
    if (
      options.method &&
      ["POST", "PUT", "DELETE", "PATCH"].includes(options.method.toUpperCase())
    ) {
      headers["X-Pi-hole-CSRF"] = this.csrfToken || "";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting with a simple retry
        if (response.status === 429 && !options.retryAttempted) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          return this.makeRequest<T>(endpoint, {
            ...options,
            retryAttempted: true,
          });
        }

        // If unauthorized, try to re-authenticate once
        if (response.status === 401) {
          // Clear invalid session
          this.sessionId = null;
          this.csrfToken = null;
          this.sessionExpiry = 0;

          // Only retry once to avoid infinite loops
          if (!options.retryAttempted) {
            await this.authenticate();
            // Mark this as a retry attempt
            return this.makeRequest<T>(endpoint, {
              ...options,
              retryAttempted: true,
            });
          }
        }

        let errorMessage;
        try {
          const errorData = (await response.json()) as Record<string, unknown>;

          // Handle Pi-hole API error format: {"error": {"key": "...", "message": "...", "hint": "..."}}
          if (errorData.error && typeof errorData.error === "object") {
            const error = errorData.error as Record<string, unknown>;
            errorMessage =
              (error.message as string) ||
              (error.hint as string) ||
              "Unknown API error";
          } else {
            // Handle standard error format
            errorMessage =
              (errorData.message as string) ||
              (errorData.error as string) ||
              `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.authenticate();
      const response = await this.makeRequest<{ version?: string }>(
        "/api/stats/summary",
      );
      return {
        success: true,
        version: response.version,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getStatus(): Promise<PiHoleStatus> {
    const [summaryResponse, blockingResponse] = await Promise.all([
      this.makeRequest<Record<string, unknown>>("/api/stats/summary"),
      this.makeRequest<Record<string, unknown>>("/api/dns/blocking"),
    ]);

    const queries = (summaryResponse.queries as Record<string, unknown>) || {};
    const clients = (summaryResponse.clients as Record<string, unknown>) || {};
    const gravity = (summaryResponse.gravity as Record<string, unknown>) || {};

    return {
      status:
        blockingResponse.blocking === "enabled" ||
        blockingResponse.blocking === true
          ? "enabled"
          : "disabled",
      domains_being_blocked: Number(gravity.domains_being_blocked) || 0,
      dns_queries_today: Number(queries.total) || 0,
      ads_blocked_today: Number(queries.blocked) || 0,
      ads_percentage_today: Number(queries.percent_blocked) || 0,
      unique_domains: Number(queries.unique_domains) || 0,
      queries_forwarded: Number(queries.forwarded) || 0,
      queries_cached: Number(queries.cached) || 0,
      clients_ever_seen: Number(clients.total) || 0,
      unique_clients: Number(clients.active) || 0,
      gravity_last_updated: {
        file_exists: true,
        absolute: Number(gravity.last_update) || 0,
        relative: { days: 0, hours: 0, minutes: 0 },
      },
    };
  }

  async enable(): Promise<void> {
    await this.makeRequest("/api/dns/blocking", {
      method: "POST",
      body: JSON.stringify({ blocking: true }),
    });
  }

  async disable(options: DisableOptions = {}): Promise<void> {
    let duration: number | undefined;

    if (options.duration && typeof options.duration === "string") {
      duration = parseDuration(options.duration);
    } else if (options.seconds) {
      duration = options.seconds;
    }

    const body: Record<string, unknown> = { blocking: false };
    if (duration) {
      body.timer = duration;
    }

    await this.makeRequest("/api/dns/blocking", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async queryDomain(domain: string): Promise<PiHoleQueryResult> {
    const response = await this.makeRequest<{
      queries?: Array<Record<string, unknown>>;
      recordsFiltered?: number;
    }>(`/api/queries?domain=${encodeURIComponent(domain)}&limit=1`);

    const queries = response.queries || [];
    const totalQueries = response.recordsFiltered || 0;

    if (queries.length === 0) {
      return {
        domain,
        status: totalQueries > 0 ? "no_recent_queries" : "never_queried",
        reason:
          totalQueries > 0
            ? "No recent queries found"
            : "Domain has never been queried",
        type: "A",
        lastSeen: 0,
        queryCount: totalQueries,
      };
    }

    const latestQuery = queries[0] ? queries[0] : {};
    return {
      domain,
      status: this.parseQueryStatus(
        (latestQuery.status as string) || "unknown",
      ),
      reason: this.getStatusDescription(latestQuery.status as string),
      type: this.parseQueryType((latestQuery.type as string) || "A"),
      lastSeen: Number(latestQuery.time) || 0,
      queryCount: totalQueries,
    };
  }

  private parseQueryStatus(
    status: string,
  ): "blocked" | "allowed" | "unknown" | "no_recent_queries" | "never_queried" {
    const validStatuses: (
      | "blocked"
      | "allowed"
      | "unknown"
      | "no_recent_queries"
      | "never_queried"
    )[] = [
      "blocked",
      "allowed",
      "unknown",
      "no_recent_queries",
      "never_queried",
    ];
    return validStatuses.includes(
      status as
        | "blocked"
        | "allowed"
        | "unknown"
        | "no_recent_queries"
        | "never_queried",
    )
      ? (status as
          | "blocked"
          | "allowed"
          | "unknown"
          | "no_recent_queries"
          | "never_queried")
      : "unknown";
  }

  private parseQueryType(
    type: string,
  ): "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX" {
    const validTypes: (
      | "A"
      | "AAAA"
      | "PTR"
      | "SRV"
      | "TXT"
      | "CNAME"
      | "MX"
    )[] = ["A", "AAAA", "PTR", "SRV", "TXT", "CNAME", "MX"];
    return validTypes.includes(
      type as "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX",
    )
      ? (type as "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX")
      : "A";
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case "FORWARDED":
        return "Allowed - forwarded to upstream DNS";
      case "CACHE":
        return "Allowed - served from cache";
      case "CACHE_STALE":
        return "Allowed - served from stale cache";
      case "GRAVITY":
        return "Blocked - gravity list";
      case "REGEX":
        return "Blocked - regex filter";
      case "DENYLIST":
        return "Blocked - denylist";
      case "EXTERNAL_BLOCKED_IP":
        return "Blocked - external blocklist (IP)";
      case "EXTERNAL_BLOCKED_NULL":
        return "Blocked - external blocklist (null)";
      case "EXTERNAL_BLOCKED_NXRA":
        return "Blocked - external blocklist (NXDOMAIN)";
      case "GRAVITY_CNAME":
        return "Blocked - gravity list (CNAME)";
      case "REGEX_CNAME":
        return "Blocked - regex filter (CNAME)";
      case "DENYLIST_CNAME":
        return "Blocked - denylist (CNAME)";
      default:
        return status || "Unknown status";
    }
  }

  async getAllowlist(): Promise<PiHoleDomainList[]> {
    const response = await this.makeRequest<{
      domains?: Array<Record<string, unknown>>;
    }>("/api/domains");
    return this.parseDomainListFromAll(response, "allow");
  }

  async getDenylist(): Promise<PiHoleDomainList[]> {
    const response = await this.makeRequest<{
      domains?: Array<Record<string, unknown>>;
    }>("/api/domains");
    return this.parseDomainListFromAll(response, "deny");
  }

  private parseDomainListFromAll(
    response: { domains?: Array<Record<string, unknown>> },
    filterType: "allow" | "deny",
  ): PiHoleDomainList[] {
    if (!response.domains || !Array.isArray(response.domains)) {
      return [];
    }

    return response.domains
      .filter((item: Record<string, unknown>) => item.type === filterType)
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id) || 0,
        domain: (item.domain as string) || "",
        type: (item.type as "allow" | "deny") || filterType,
        enabled: (item.enabled as boolean) !== false,
        date_added: Number(item.date_added) || 0,
        date_modified: Number(item.date_modified) || 0,
        comment: (item.comment as string) || "",
      }));
  }

  private parseDomainList(
    response: { domains?: Array<Record<string, unknown>> },
    type: "allow" | "deny",
  ): PiHoleDomainList[] {
    if (!response.domains || !Array.isArray(response.domains)) {
      return [];
    }

    return response.domains.map(
      (item: Record<string, unknown>, index: number) => ({
        id: index,
        domain: (item.domain as string) || (item as unknown as string),
        type,
        enabled: (item.enabled as boolean) !== false,
        date_added: Number(item.date_added) || 0,
        date_modified: Number(item.date_modified) || 0,
        comment: (item.comment as string) || "",
      }),
    );
  }

  async getRecentQueries(count = 100): Promise<PiHoleQuery[]> {
    const response = await this.makeRequest<{
      queries?: Array<Record<string, unknown>>;
    }>(`/api/queries?limit=${count}`);

    if (!response.queries || !Array.isArray(response.queries)) {
      return [];
    }

    return response.queries.map((item: Record<string, unknown>) => {
      const rawStatus = (item.status as string) || "unknown";
      const status: "blocked" | "allowed" | "unknown" =
        rawStatus === "blocked" || rawStatus === "allowed"
          ? rawStatus
          : "unknown";

      const rawType = (item.type as string) || "A";
      const type: "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX" = [
        "A",
        "AAAA",
        "PTR",
        "SRV",
        "TXT",
        "CNAME",
        "MX",
      ].includes(rawType)
        ? (rawType as "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX")
        : "A";

      return {
        domain: (item.domain as string) || "",
        status,
        type,
        client: (item.client as string) || "",
        timestamp: Number(item.timestamp) || 0,
      };
    });
  }
}
