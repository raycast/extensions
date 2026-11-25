export type QueryValue = string | number | boolean | readonly string[] | undefined;

export type ApiConfig = {
  baseUrl: string;
  apiKey: string;
  userAgent: string;
};

export type ApiRequest = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
};

type ErrorBody = {
  message?: string | string[];
  error?: string;
  code?: string;
};

const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function buildUrl(baseUrl: string, path: string, query: ApiRequest["query"] = {}): string {
  const url = new URL(`${baseUrl}${path}`);
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined) continue;
    const values = typeof value === "object" ? value : [String(value)];
    for (const item of values) url.searchParams.append(name, item);
  }
  return url.toString();
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function errorMessage(response: Response, body: ErrorBody | undefined): string {
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `Rate limit reached. Try again in ${retryAfter} seconds.`
      : "Rate limit reached. Try again soon.";
  }
  const message = Array.isArray(body?.message) ? body?.message.join(", ") : body?.message;
  return message || body?.error || `The request failed with status ${response.status}.`;
}

export async function requestJson<T>(config: ApiConfig, request: ApiRequest): Promise<T> {
  const hasBody = request.body !== undefined;
  const response = await fetch(buildUrl(config.baseUrl, request.path, request.query), {
    method: request.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey.trim()}`,
      "User-Agent": config.userAgent,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = parseBody(await response.text());
  if (!response.ok) {
    const errorBody = body as ErrorBody | undefined;
    throw new ApiError(errorMessage(response, errorBody), response.status, errorBody?.code);
  }
  return body as T;
}
