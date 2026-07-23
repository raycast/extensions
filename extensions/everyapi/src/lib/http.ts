import type { FetchLike } from "./oauth-protocol";

export interface AuthTokenProvider {
  getAccessToken(forceRefresh?: boolean): Promise<string | undefined>;
}

export async function authenticatedFetch(
  auth: AuthTokenProvider,
  fetch: FetchLike,
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const request = async (forceRefresh: boolean) => {
    const token = await auth.getAccessToken(forceRefresh);
    if (!token) throw new ApiError(401, "Sign in to EveryAPI to continue");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input instanceof Request ? input.clone() : input, {
      ...init,
      headers,
    });
  };
  const response = await request(false);
  return response.status === 401 ? request(true) : response;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface HttpClientOptions {
  origin: string;
  auth: AuthTokenProvider;
  fetch?: FetchLike;
  timeoutMs?: number;
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
}

function safeErrorMessage(
  body: unknown,
  status: number,
  secrets: string[],
): string {
  const candidate =
    body && typeof body === "object"
      ? ((body as Record<string, unknown>).message ??
        (body as Record<string, unknown>).error_description ??
        (body as Record<string, unknown>).error)
      : undefined;
  if (typeof candidate !== "string" || !candidate.trim()) {
    return `EveryAPI request failed (HTTP ${status})`;
  }
  let result = candidate.trim();
  for (const secret of secrets) {
    if (secret) result = result.replaceAll(secret, "[redacted]");
  }
  return result;
}

export class HttpClient {
  private readonly origin: string;
  private readonly auth: AuthTokenProvider;
  private readonly fetch: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: HttpClientOptions) {
    this.origin = options.origin.replace(/\/+$/, "");
    this.auth = options.auth;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    return this.request<T>(path, {
      ...options,
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async request<T>(
    path: string,
    options: RequestOptions,
    didRefresh = false,
  ): Promise<T> {
    const authenticated = options.authenticated !== false;
    const accessToken = authenticated
      ? await this.auth.getAccessToken(didRefresh)
      : undefined;
    if (authenticated && !accessToken) {
      throw new ApiError(401, "Sign in to EveryAPI to continue");
    }
    const headers = new Headers(options.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("Accept", "application/json");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetch(`${this.origin}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(0, "EveryAPI request timed out");
      }
      throw new ApiError(
        0,
        error instanceof Error
          ? `Could not reach EveryAPI: ${error.message}`
          : "Could not reach EveryAPI",
      );
    } finally {
      clearTimeout(timer);
    }

    if (authenticated && !didRefresh && response.status === 401) {
      return this.request<T>(path, options, true);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (response.ok) {
        throw new ApiError(
          response.status,
          "EveryAPI returned an invalid response",
        );
      }
      throw new ApiError(
        response.status,
        `EveryAPI request failed (HTTP ${response.status})`,
      );
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        safeErrorMessage(body, response.status, [accessToken ?? ""]),
      );
    }
    return body as T;
  }
}
