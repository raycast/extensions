import { ExecutionRouteTarget } from "./types";

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export type JsonRequestErrorKind = "network" | "timeout" | "http" | "parse";
type JsonRequestHeaders = NonNullable<RequestInit["headers"]>;

export interface JsonRequestOptions {
  target: ExecutionRouteTarget;
  baseUrl: string;
  path: string;
  method?: string;
  headers?: JsonRequestHeaders;
  body?: string;
  authHeader?: {
    name: string;
    value: string;
  };
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface JsonRequestResult<T> {
  payload: T;
  headers: Headers;
  status: number;
}

export class JsonRequestError extends Error {
  constructor(
    message: string,
    readonly kind: JsonRequestErrorKind,
    readonly target: ExecutionRouteTarget,
    readonly url: string,
    readonly status?: number,
    readonly payload?: unknown,
    readonly bodyText?: string,
  ) {
    super(message);
    this.name = "JsonRequestError";
  }
}

export async function requestJson<T>(
  options: JsonRequestOptions,
): Promise<JsonRequestResult<T>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authHeader) {
    headers.set(options.authHeader.name, options.authHeader.value);
  }

  const url = buildRequestUrl(options.baseUrl, options.path);
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    const parsed = text.length > 0 ? tryParseJson(text) : undefined;

    if (!response.ok) {
      throw new JsonRequestError(
        `${describeTarget(options.target)} request failed with status ${response.status}.`,
        "http",
        options.target,
        url,
        response.status,
        parsed,
        text,
      );
    }

    if (text.length === 0) {
      return {
        payload: {} as T,
        headers: response.headers,
        status: response.status,
      };
    }

    if (parsed === undefined) {
      throw new JsonRequestError(
        `${describeTarget(options.target)} returned an unreadable JSON response.`,
        "parse",
        options.target,
        url,
        response.status,
        undefined,
        text,
      );
    }

    return {
      payload: parsed as T,
      headers: response.headers,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof JsonRequestError) {
      throw error;
    }

    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      throw new JsonRequestError(
        `${describeTarget(options.target)} request timed out after ${timeoutMs}ms.`,
        "timeout",
        options.target,
        url,
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown network error";
    throw new JsonRequestError(
      `Unable to reach ${describeTarget(options.target)} at ${url}. ${message}`,
      "network",
      options.target,
      url,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function describeTarget(target: ExecutionRouteTarget): string {
  return target === "witness" ? "Witness gateway" : "Selemene";
}

function buildRequestUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
