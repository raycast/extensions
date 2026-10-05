import type { DolibarrConfig } from "../preferences";

export const PAGE_SIZE = 1000;

export class DolibarrError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DolibarrError";
  }
}

export type Params = Record<string, string | number>;

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type Client = {
  list<T>(path: string, params?: Params): Promise<T[]>;
  one<T>(path: string, params?: Params): Promise<T>;
  all<T>(path: string, params?: Params): Promise<T[]>;
};

function buildUrl(baseUrl: string, path: string, params: Params): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix.length > 0 ? `${baseUrl}${path}?${suffix}` : `${baseUrl}${path}`;
}

/** Maps HTTP status codes to messages a user can act on. Never includes the API key. */
function describeStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "The API key was rejected. Check it in the extension preferences.";
  }
  if (status >= 500) {
    return `Dolibarr reported a server error (HTTP ${status}).`;
  }
  return `Dolibarr rejected the request (HTTP ${status}).`;
}

/**
 * undici reports every connection problem as a bare "fetch failed" and hides the real reason —
 * DNS, TLS, refused connection — one level down in `cause`. Surfacing it plus the target URL is
 * the difference between a diagnosable error and a dead end.
 */
function describeNetworkFailure(error: unknown, url: string): string {
  const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
  const detail = cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : String(error));
  return `Cannot reach ${url} (${detail}). Check the Dolibarr URL in the extension preferences and whether the instance is up.`;
}

export function createClient(config: DolibarrConfig, fetchImpl: FetchLike = fetch as unknown as FetchLike): Client {
  async function request(path: string, params: Params): Promise<{ status: number; body: unknown; ok: boolean }> {
    const url = buildUrl(config.baseUrl, path, params);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { DOLAPIKEY: config.apiKey, Accept: "application/json" },
      });
    } catch (error) {
      throw new DolibarrError(describeNetworkFailure(error, `${config.baseUrl}${path}`));
    }
    if (!response.ok) {
      return { status: response.status, body: null, ok: false };
    }
    return { status: response.status, body: await response.json(), ok: true };
  }

  async function list<T>(path: string, params: Params = {}): Promise<T[]> {
    const result = await request(path, params);
    // Dolibarr answers an empty collection with 404 on some endpoints and with [] on others.
    if (!result.ok) {
      if (result.status === 404) return [];
      throw new DolibarrError(describeStatus(result.status), result.status);
    }
    return Array.isArray(result.body) ? (result.body as T[]) : [];
  }

  async function one<T>(path: string, params: Params = {}): Promise<T> {
    const result = await request(path, params);
    if (!result.ok) {
      throw new DolibarrError(describeStatus(result.status), result.status);
    }
    return result.body as T;
  }

  async function all<T>(path: string, params: Params = {}): Promise<T[]> {
    const collected: T[] = [];
    for (let page = 0; ; page++) {
      const batch = await list<T>(path, { ...params, limit: PAGE_SIZE, page });
      collected.push(...batch);
      if (batch.length < PAGE_SIZE) return collected;
    }
  }

  return { list, one, all };
}
