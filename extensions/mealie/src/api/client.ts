export interface MealieConfig {
  baseUrl: string;
  token: string;
  allowInsecureHttp: boolean;
}

export type MealieErrorKind = "config" | "auth" | "notFound" | "badRequest" | "server" | "network";

export class MealieError extends Error {
  readonly kind: MealieErrorKind;
  readonly status?: number;

  constructor(message: string, kind: MealieErrorKind, status?: number) {
    super(message);
    this.name = "MealieError";
    this.kind = kind;
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  total: number;
  total_pages: number;
  next: string | null;
}

export interface MealieClient {
  get<T>(path: string, query?: QueryParams): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del(path: string): Promise<void>;
  getAllPages<T>(path: string, query?: QueryParams, pageSize?: number): Promise<T[]>;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const MAX_PAGES = 50;

export function normalizeBaseUrl(raw: string): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new MealieError("No Mealie URL is configured.", "config");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
  return withScheme.replace(/\/api$/i, "").replace(/\/+$/, "");
}

export function assertSecureUrl(baseUrl: string, allowInsecureHttp: boolean): void {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new MealieError("The Mealie URL is not a valid URL.", "config");
  }
  if (url.protocol === "https:") return;
  if (url.protocol !== "http:") {
    throw new MealieError("The Mealie URL must use HTTPS.", "config");
  }
  if (LOCAL_HOSTS.has(url.hostname) || allowInsecureHttp) return;
  throw new MealieError(
    "Refusing to send your API token over plain HTTP. Use HTTPS, or allow insecure connections in the extension preferences.",
    "config",
  );
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readDetail(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim().slice(0, 300);
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === "string") return first.msg.slice(0, 300);
    }
  } catch {
    // Antwort war kein JSON. Der generische Text unten reicht dann.
  }
  return undefined;
}

async function toMealieError(response: Response): Promise<MealieError> {
  const status = response.status;
  if (status === 401 || status === 403) {
    return new MealieError(
      "Your Mealie API token was rejected. Check it in the extension preferences.",
      "auth",
      status,
    );
  }
  if (status === 404) {
    return new MealieError("Mealie returned 404. Check that the URL points at a Mealie instance.", "notFound", status);
  }
  if (status === 400 || status === 422) {
    const detail = await readDetail(response);
    return new MealieError(detail ?? "Mealie rejected the request.", "badRequest", status);
  }
  return new MealieError("Mealie responded with HTTP " + status + ".", "server", status);
}

export function createMealieClient(config: MealieConfig, fetchImpl: typeof fetch = fetch): MealieClient {
  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: QueryParams } = {},
  ): Promise<T> {
    assertSecureUrl(config.baseUrl, config.allowInsecureHttp);
    if (!config.token) {
      throw new MealieError("No API token is configured.", "config");
    }

    const headers: Record<string, string> = {
      Authorization: "Bearer " + config.token,
      Accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetchImpl(buildUrl(config.baseUrl, path, options.query), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      // Die ursprüngliche Fehlermeldung wird bewusst verworfen, sie kann die URL enthalten.
      throw new MealieError("Could not reach your Mealie instance. Check the URL and your network.", "network");
    }

    if (!response.ok) throw await toMealieError(response);
    if (response.status === 204) return undefined as T;

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  return {
    get: (path, query) => request("GET", path, { query }),
    post: (path, body) => request("POST", path, { body }),
    put: (path, body) => request("PUT", path, { body }),
    del: async (path) => {
      await request<void>("DELETE", path);
    },
    async getAllPages<T>(path: string, query?: QueryParams, pageSize = 100): Promise<T[]> {
      const collected: T[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await request<PaginatedResponse<T>>("GET", path, {
          query: { ...query, page, perPage: pageSize },
        });
        const items = response.items ?? [];
        collected.push(...items);
        if (items.length === 0 || page >= (response.total_pages ?? 1)) break;
      }
      return collected;
    },
  };
}
