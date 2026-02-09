/**
 * Core Odoo API client for handling HTTP requests and session management
 */

import fetch from "node-fetch";
import { JsonRpcRequest, JsonRpcResponse, OdooApiError, SessionExpiredError } from "./types";

export class OdooClient {
  private baseUrl: string;
  private sessionId: string | null;
  private cookies: string[] = [];
  private requestId = 1;

  constructor(baseUrl: string, sessionId: string | null = null, cookies: string[] = []) {
    // Ensure baseUrl doesn't have trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.sessionId = sessionId;

    // Initialize cookies if session ID is provided
    if (cookies.length > 0) {
      this.cookies = cookies;
    } else if (sessionId) {
      this.cookies = [`session_id=${sessionId}`];
    }

    console.log(`[OdooClient] Constructor - SessionID: ${this.sessionId}, Cookies: ${JSON.stringify(this.cookies)}`);
  }

  /**
   * Set the session ID for authenticated requests
   */
  setSession(sessionId: string, cookies: string[] = []): void {
    console.log(`[OdooClient] setSession called - SessionID: ${sessionId}, Cookies: ${JSON.stringify(cookies)}`);
    this.sessionId = sessionId;
    if (cookies.length > 0) {
      this.cookies = cookies;
    } else {
      this.cookies = [`session_id=${sessionId}`];
    }
    console.log(
      `[OdooClient] After setSession - SessionID: ${this.sessionId}, Cookies: ${JSON.stringify(this.cookies)}`,
    );
  }

  /**
   * Get the current session ID
   */
  getSession(): string | null {
    return this.sessionId;
  }

  /**
   * Get all cookies for session persistence
   */
  getCookies(): string[] {
    return this.cookies;
  }

  /**
   * Update cookies from response headers
   */
  private updateCookiesFromResponse(response: Response): void {
    // Get Set-Cookie header - note: Headers.get() only returns the first value
    // We need to handle multiple Set-Cookie headers
    const setCookieHeader = response.headers.get("set-cookie");

    console.log(`[OdooClient] Set-Cookie header: ${setCookieHeader}`);

    if (!setCookieHeader) {
      return;
    }

    // Split multiple Set-Cookie values (they may be comma-separated)
    const cookieHeaders = setCookieHeader.split(/,(?=[^;]+?=)/);

    for (const cookieHeader of cookieHeaders) {
      // Extract cookie name and value (before the first semicolon)
      const cookiePair = cookieHeader.split(";")[0].trim();
      const [name] = cookiePair.split("=");

      if (!name) continue;

      console.log(`[OdooClient] Updating cookie: ${cookiePair}`);

      // Remove old cookie with same name
      this.cookies = this.cookies.filter((c) => !c.startsWith(`${name}=`));

      // Add new cookie
      this.cookies.push(cookiePair);
    }
  }

  /**
   * Make a JSON-RPC request to Odoo
   */
  async request<T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "call",
      params,
      id: this.requestId++,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add session cookie if available (check cookies array, not just sessionId)
    if (this.sessionId || this.cookies.length > 0) {
      headers["Cookie"] = this.getCookieHeader();
      console.log(`[OdooClient] Sending cookies: ${headers["Cookie"]}`);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      // Update cookies from response
      this.updateCookiesFromResponse(response);
      console.log(`[OdooClient] Current cookies after response: ${this.cookies.join("; ")}`);

      if (!response.ok) {
        // Check for authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new SessionExpiredError();
        }

        throw new OdooApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const jsonResponse = (await response.json()) as JsonRpcResponse<T>;

      console.log(`[OdooClient] Response for ${endpoint}:`, JSON.stringify(jsonResponse).substring(0, 500));

      // Check for JSON-RPC errors
      if (jsonResponse.error) {
        const errorMessage = jsonResponse.error.data?.message || jsonResponse.error.message;
        throw new OdooApiError(errorMessage, jsonResponse.error.code, jsonResponse.error.data?.debug);
      }

      // Check for session expiration in response
      // Be more careful - don't treat all false/null as session expired
      // Only if the response explicitly indicates auth failure
      if (jsonResponse.result === false && endpoint.includes("/web/session")) {
        // Session endpoints return false when session is invalid
        throw new SessionExpiredError();
      }

      return jsonResponse.result as T;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof OdooApiError || error instanceof SessionExpiredError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        throw new OdooApiError(`Network error: ${error.message}`);
      }

      throw new OdooApiError("Unknown error occurred");
    }
  }

  /**
   * Make a request to Odoo's dataset call_kw endpoint (for model method calls)
   */
  async callKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    // Ensure kwargs has context
    const finalKwargs = {
      ...kwargs,
      context: kwargs.context || {},
    };

    return this.request<T>("/web/dataset/call_kw", {
      model,
      method,
      args,
      kwargs: finalKwargs,
    });
  }

  /**
   * Generate cookie header from stored cookies
   */
  private getCookieHeader(): string {
    if (this.cookies.length === 0) {
      return "";
    }

    return this.cookies.join("; ");
  }

  /**
   * Validate the base URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Normalize a base URL (ensure it starts with https:// if no protocol)
   */
  static normalizeUrl(url: string): string {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  }
}
