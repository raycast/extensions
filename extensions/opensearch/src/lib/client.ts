import { Agent, request } from "undici";
import aws4 from "aws4";
import type { Connection } from "./connections";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD";

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "HEAD"];

export interface OSResponse {
  status: number;
  ok: boolean;
  durationMs: number;
  data: unknown;
  raw: string;
}

export function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
}

function safeParse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A single reusable dispatcher for connections that opt out of TLS verification.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

// Fail fast instead of hanging on an unreachable cluster.
const REQUEST_TIMEOUT_MS = 20_000;

function authHeaders(connection: Connection, method: HttpMethod, url: URL, body?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";

  if (connection.auth === "basic" && connection.username) {
    const token = Buffer.from(`${connection.username}:${connection.password ?? ""}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
    return headers;
  }

  if (connection.auth === "sigv4") {
    const signed = aws4.sign(
      {
        host: url.host,
        path: url.pathname + url.search,
        method,
        service: connection.awsService ?? "es",
        region: connection.awsRegion,
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      },
      {
        accessKeyId: connection.awsAccessKeyId ?? "",
        secretAccessKey: connection.awsSecretAccessKey ?? "",
        sessionToken: connection.awsSessionToken,
      },
    );
    for (const [key, value] of Object.entries(signed.headers ?? {})) {
      // `Host` and `Content-Length` are managed by undici; setting them manually is rejected.
      if (key.toLowerCase() === "host" || key.toLowerCase() === "content-length") continue;
      headers[key] = String(value);
    }
  }

  return headers;
}

export async function osRequest(
  connection: Connection,
  method: HttpMethod,
  path: string,
  body?: string,
): Promise<OSResponse> {
  // Callers such as the AI tool aren't guaranteed to send an uppercase verb; normalize
  // once so the signature (for SigV4) and the request on the wire always agree.
  const normalizedMethod = method.toUpperCase() as HttpMethod;
  const url = new URL(joinUrl(connection.url, path));
  const headers = authHeaders(connection, normalizedMethod, url, body);

  const start = Date.now();
  // undici's `request` (unlike `fetch`) allows a body on GET/HEAD, which OpenSearch
  // relies on for idiomatic requests such as `GET /index/_search` with a query DSL.
  let response;
  try {
    response = await request(url, {
      method: normalizedMethod,
      headers,
      body: body || undefined,
      dispatcher: connection.ignoreCerts ? insecureAgent : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = (error as { code?: string })?.code;
    if (name === "TimeoutError" || name === "AbortError" || code === "UND_ERR_ABORTED") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
  const raw = await response.body.text();

  return {
    status: response.statusCode,
    ok: response.statusCode >= 200 && response.statusCode < 300,
    durationMs: Date.now() - start,
    data: safeParse(raw),
    raw,
  };
}

/** `GET /_cat/indices?format=json` — used to populate index pickers. */
export async function catIndices(connection: Connection): Promise<string[]> {
  const response = await osRequest(connection, "GET", "/_cat/indices?format=json&h=index&s=index");
  if (!response.ok || !Array.isArray(response.data)) return [];
  return (response.data as { index: string }[]).map((row) => row.index).filter(Boolean);
}

/** `GET /{index}/_mapping` — raw mapping payload for a single index. */
export async function getMapping(connection: Connection, index: string): Promise<unknown> {
  const response = await osRequest(connection, "GET", `/${encodeURIComponent(index)}/_mapping`);
  return response.data;
}
