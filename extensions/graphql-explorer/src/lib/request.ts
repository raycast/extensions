import { GraphQLEnvironment } from "./types";

export const REQUEST_TIMEOUT_MS = 60_000;

export interface GraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface ExecutionResult {
  /** HTTP status, undefined when the request never got a response */
  status?: number;
  statusText?: string;
  durationMs: number;
  /** Size of the response body in bytes */
  size: number;
  rawBody: string;
  /** Parsed body when the server answered with JSON */
  json?: unknown;
  /** Number of entries in the GraphQL `errors` array */
  graphQLErrorCount: number;
  /** Network / timeout error */
  error?: string;
}

// Headers ---------------------------------------------------------------------------------------------------------

/** RFC 9110 token: what `fetch` accepts as a header name. */
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const isValidHeaderName = (name: string) => HEADER_NAME.test(name);

export function buildHeaders(env: Pick<GraphQLEnvironment, "headers">): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/graphql-response+json, application/json;q=0.9, */*;q=0.8",
  };
  for (const header of env.headers) {
    // User headers win over the defaults, case-insensitively.
    for (const key of Object.keys(result)) {
      if (key.toLowerCase() === header.name.toLowerCase()) delete result[key];
    }
    result[header.name] = header.value;
  }
  return result;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Execution -------------------------------------------------------------------------------------------------------

/** Node's fetch hides the real reason in `cause`, which may be an AggregateError with an empty message. */
function describeCause(cause: unknown): string | undefined {
  if (!cause) return undefined;
  if (typeof cause !== "object") return String(cause);
  const { message, code, errors } = cause as { message?: string; code?: string; errors?: unknown[] };
  if (message) return message;
  if (code) return code;
  if (Array.isArray(errors) && errors.length > 0) return describeCause(errors[0]);
  return undefined;
}

function describeFetchError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") return `Request timed out after ${timeoutMs / 1000}s`;
    if (error.name === "AbortError") return "Request cancelled";
    const detail = describeCause((error as Error & { cause?: unknown }).cause);
    return detail ? `${error.message}: ${detail}` : error.message;
  }
  return String(error);
}

export async function executeGraphQL(
  env: Pick<GraphQLEnvironment, "url" | "headers">,
  body: GraphQLRequestBody,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ExecutionResult> {
  const started = performance.now();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  try {
    const response = await fetch(env.url, {
      method: "POST",
      headers: buildHeaders(env),
      body: JSON.stringify(body),
      signal,
    });
    const rawBody = await response.text();
    const durationMs = Math.round(performance.now() - started);
    let json: unknown;
    try {
      json = rawBody ? JSON.parse(rawBody) : undefined;
    } catch {
      json = undefined;
    }
    const errors = json && typeof json === "object" ? (json as { errors?: unknown }).errors : undefined;
    return {
      status: response.status,
      statusText: response.statusText,
      durationMs,
      size: Buffer.byteLength(rawBody),
      rawBody,
      json,
      graphQLErrorCount: Array.isArray(errors) ? errors.length : 0,
    };
  } catch (error) {
    return {
      durationMs: Math.round(performance.now() - started),
      size: 0,
      rawBody: "",
      graphQLErrorCount: 0,
      error: describeFetchError(error, timeoutMs),
    };
  }
}

export function isSuccessful(result: ExecutionResult): boolean {
  return !result.error && result.status !== undefined && result.status < 400 && result.graphQLErrorCount === 0;
}

// Helpers ---------------------------------------------------------------------------------------------------------

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

export function buildCurl(env: Pick<GraphQLEnvironment, "url" | "headers">, body: GraphQLRequestBody): string {
  const parts = [`curl -X POST ${shellQuote(env.url)}`];
  for (const [name, value] of Object.entries(buildHeaders(env))) {
    parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
  }
  parts.push(`--data-raw ${shellQuote(JSON.stringify(body))}`);
  return parts.join(" \\\n  ");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Wraps text in a fenced code block whose fence cannot be closed by the content itself. */
export function codeBlock(language: string, content: string): string {
  const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}
