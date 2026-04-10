// src/api/client.ts
import { buildTaskUrl } from "../lib/url";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(
    public readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    return this.request<T>(url.toString(), { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    return this.request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let body: unknown = null;
      const text = await response.text().catch(() => "");
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      throw new ApiError(
        response.status,
        body,
        `${init.method ?? "GET"} ${url} failed with HTTP ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Almost always means an HTML auth-redirect page from a missing/expired token.
      throw new ApiError(401, null, "Authentication required (server returned non-JSON)");
    }

    return (await response.json()) as T;
  }

  /**
   * Build a URL + headers pair for opening an SSE EventSource. The eventsource
   * npm package needs the headers passed to its constructor (the global
   * EventSource doesn't support custom headers).
   */
  buildStreamUrl(path: string): { url: string; headers: Record<string, string> } {
    return {
      url: new URL(path, this.baseUrl).toString(),
      headers: { Authorization: `Bearer ${this.token}` },
    };
  }

  /** Build a user-facing task URL. */
  taskUrl(repoFullName: string, taskId: string): string {
    return buildTaskUrl(this.baseUrl, repoFullName, taskId);
  }
}
