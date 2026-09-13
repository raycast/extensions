import { parseApiCatalog, splitProcedurePath } from "../lib/catalog";
import { isJsonObject, isJsonValue, parseJsonValue } from "../lib/json";
import { ApiCatalog, ApiProcedure, JsonObject, JsonValue } from "../types/api";

export interface TinkererApiConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

export type FetchAdapter = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class TinkererApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TinkererApiError";
  }
}

function validateBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The Tinkerer Club base URL is invalid.");
  }

  const isLocalDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalDevelopment)) {
    throw new Error("The Tinkerer Club base URL must use HTTPS. HTTP is allowed only for local development.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function responseErrorMessage(value: JsonValue, fallback: string): string {
  if (!isJsonObject(value)) {
    return fallback;
  }

  const error = value.error;
  if (typeof error === "string") {
    return error;
  }
  if (isJsonObject(error) && typeof error.message === "string") {
    return error.message;
  }
  if (typeof value.message === "string") {
    return value.message;
  }
  return fallback;
}

export class TinkererApiClient {
  readonly baseUrl: string;
  readonly catalogUrl: string;
  readonly docsUrl: string;

  private readonly apiKey: string;
  private readonly fetchAdapter: FetchAdapter;
  private readonly timeoutMs: number;

  constructor(config: TinkererApiConfig, fetchAdapter: FetchAdapter = fetch) {
    this.baseUrl = validateBaseUrl(config.baseUrl);
    this.catalogUrl = new URL("/api/v1", `${this.baseUrl}/`).toString();
    this.docsUrl = new URL("/api/docs", `${this.baseUrl}/`).toString();
    this.apiKey = config.apiKey;
    this.fetchAdapter = fetchAdapter;
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  async catalog(signal?: AbortSignal): Promise<ApiCatalog> {
    const payload = await this.request(this.catalogUrl, { method: "GET" }, signal);
    return parseApiCatalog(payload);
  }

  procedureUrl(path: string): string {
    const { router, procedure } = splitProcedurePath(path);
    return new URL(
      `/api/v1/${encodeURIComponent(router)}/${encodeURIComponent(procedure)}`,
      `${this.baseUrl}/`,
    ).toString();
  }

  async call<TInput extends JsonObject>(
    procedure: Pick<ApiProcedure, "path" | "type">,
    input: TInput,
    signal?: AbortSignal,
  ): Promise<JsonValue> {
    return this.request(
      this.procedureUrl(procedure.path),
      {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      signal,
    );
  }

  private async request(url: string, init: RequestInit, externalSignal?: AbortSignal): Promise<JsonValue> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const forwardAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", forwardAbort, { once: true });

    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("x-api-key", this.apiKey);

    try {
      const response = await this.fetchAdapter(url, { ...init, headers, signal: controller.signal });
      const text = await response.text();
      let payload: JsonValue = null;

      if (text.length > 0) {
        try {
          payload = parseJsonValue(text, "API response");
        } catch {
          if (response.ok) {
            throw new TinkererApiError("Tinkerer Club returned a non-JSON response.", response.status);
          }
        }
      }

      if (!response.ok) {
        const fallback =
          response.status === 401 || response.status === 403
            ? "Authentication failed. Check the authorization preferences."
            : `Tinkerer Club returned HTTP ${response.status}.`;
        throw new TinkererApiError(responseErrorMessage(payload, fallback), response.status);
      }

      if (!isJsonValue(payload)) {
        throw new TinkererApiError("Tinkerer Club returned an unsupported response.");
      }
      return payload;
    } catch (error) {
      if (error instanceof TinkererApiError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new TinkererApiError(externalSignal?.aborted ? "The request was cancelled." : "The request timed out.");
      }
      throw new TinkererApiError(error instanceof Error ? error.message : "The network request failed.");
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", forwardAbort);
    }
  }
}
