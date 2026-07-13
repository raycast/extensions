import { DokployAccount } from "../accounts/types";
import { DokployApiError, DokployErrorBody, DokployNetworkError } from "./errors";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Turns whatever the user typed into the origin of the Dokploy instance.
 * Accepts `server.example.com`, `https://server.example.com/`, `https://server.example.com/api`
 * and anything in between, because all three are things people paste.
 */
export function normalizeServerUrl(input: string): string {
  let value = input.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }

  // Drop a trailing `/api` (and any trailing slashes) so we can append it ourselves.
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");
  return `${url.origin}${path}`;
}

export function isValidServerUrl(input: string): boolean {
  return normalizeServerUrl(input).length > 0;
}

/** The value Dokploy sends for a query parameter - anything else gets JSON-encoded. */
type QueryValue = string | number | boolean | undefined | null;

/**
 * A thin typed wrapper over one Dokploy instance's REST API.
 *
 * Dokploy exposes its tRPC router over OpenAPI at `<origin>/api`, where every route is a
 * dotted procedure name: reads are `GET /api/project.all?projectId=...` and writes are
 * `POST /api/application.deploy` with a JSON body. Auth is the `x-api-key` header.
 * Responses are the procedure's output as-is; there is no `{ success, data }` envelope.
 */
export class DokployClient {
  readonly account: DokployAccount;
  private readonly baseUrl: string;

  constructor(account: DokployAccount) {
    this.account = account;
    this.baseUrl = `${normalizeServerUrl(account.url)}/api`;
  }

  /** The instance's web UI, for "Open in Browser" actions. */
  get webUrl(): string {
    return normalizeServerUrl(this.account.url);
  }

  async get<T>(route: string, params?: Record<string, QueryValue>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${route}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return this.request<T>(url.toString(), { method: "GET" });
  }

  async post<T>(route: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>(`${this.baseUrl}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          "x-api-key": this.account.apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new DokployNetworkError(this.webUrl, error);
    }

    const raw = await response.text();

    if (!response.ok) {
      let body: Partial<DokployErrorBody> | undefined;
      try {
        body = JSON.parse(raw) as Partial<DokployErrorBody>;
      } catch {
        // Dokploy occasionally answers with an HTML error page (e.g. behind a proxy).
        body = undefined;
      }
      throw new DokployApiError(response.status, body, `Request failed with status ${response.status}`);
    }

    if (!raw) return undefined as T;

    try {
      return JSON.parse(raw) as T;
    } catch {
      // Log endpoints answer with plain text rather than JSON.
      return raw as unknown as T;
    }
  }
}
