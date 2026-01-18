const DEFAULT_BASE_URL = "https://harvest.greenhouse.io/v1";

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface HarvestClientOptions {
  apiKey: string;
  baseUrl?: string;
  onBehalfOf?: string | number | null;
}

export interface HarvestRequestOptions {
  method?: string;
  path: string;
  params?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
}

export class HarvestError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`Harvest API ${status}`);
    this.status = status;
    this.data = data;
  }
}

export class HarvestClient {
  private apiKey: string;
  private baseUrl: string;
  private onBehalfOf: string | number | null;

  constructor({
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    onBehalfOf,
  }: HarvestClientOptions) {
    if (!apiKey) {
      throw new Error("GREENHOUSE_HARVEST_API_KEY is required");
    }
    this.apiKey = apiKey;
    const resolvedBaseUrl = baseUrl?.trim();
    this.baseUrl = (resolvedBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.onBehalfOf = onBehalfOf ?? null;
  }

  buildHeaders(extraHeaders: Record<string, string> = {}) {
    const token = Buffer.from(`${this.apiKey}:`).toString("base64");
    const headers: Record<string, string> = {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (this.onBehalfOf !== null) {
      headers["On-Behalf-Of"] = String(this.onBehalfOf);
    }
    return headers;
  }

  buildUrl(path: string, params?: QueryParams) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  parseNextLink(linkHeader?: string | null) {
    if (!linkHeader) {
      return null;
    }
    const segments = linkHeader.split(",");
    for (const segment of segments) {
      const [urlPart, relPart] = segment
        .split(";")
        .map((value) => value.trim());
      if (relPart === 'rel="next"') {
        return urlPart.replace(/^</, "").replace(/>$/, "");
      }
    }
    return null;
  }

  async request<T = unknown>({
    method = "GET",
    path,
    params,
    body,
    headers,
  }: HarvestRequestOptions): Promise<{ data: T; response: Response }> {
    if (!path) {
      throw new Error("path is required");
    }
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method,
      headers: this.buildHeaders(headers),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? ((await response.json()) as T)
      : ((await response.text()) as T);

    if (!response.ok) {
      throw new HarvestError(response.status, data);
    }

    return { data, response };
  }

  async listAll<T = unknown>(path: string, params?: QueryParams): Promise<T[]> {
    let url: string | null = this.buildUrl(path, params);
    const results: T[] = [];

    while (url) {
      const response = await fetch(url, {
        headers: this.buildHeaders(),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? ((await response.json()) as T | T[])
        : ((await response.text()) as T);

      if (!response.ok) {
        throw new HarvestError(response.status, data);
      }

      if (Array.isArray(data)) {
        results.push(...data);
      } else {
        results.push(data);
      }

      url = this.parseNextLink(response.headers.get("Link"));
    }

    return results;
  }
}

export { DEFAULT_BASE_URL };
