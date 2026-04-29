import { getPreferenceValues } from "@raycast/api";
import { createHmac } from "crypto";

const BASE_URL = "https://api.mymind.com";
const USER_AGENT = "raycast-mymind/2.1.0";
const TOKEN_LIFETIME_SECONDS = 60;

interface ApiPreferences {
  keyId?: string;
  secretKey?: string;
}

export class MyMindApiError extends Error {
  readonly status: number;
  readonly type?: string;
  readonly detail?: string;

  constructor(message: string, status: number, type?: string, detail?: string) {
    super(message);
    this.name = "MyMindApiError";
    this.status = status;
    this.type = type;
    this.detail = detail;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: unknown;
  contentType?: string;
  accept?: string;
  signal?: AbortSignal;
}

function decodeSecret(secret: string): Buffer {
  const normalized = secret.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

interface ResolvedCredentials {
  keyId: string;
  encodedHeader: string;
  secretBytes: Buffer;
}

let cachedCredentials: { raw: string; resolved: ResolvedCredentials } | null = null;

function getCredentials(): ResolvedCredentials {
  const prefs = getPreferenceValues<ApiPreferences>();
  const keyId = prefs.keyId?.trim();
  const secretKey = prefs.secretKey?.trim();
  if (!keyId || !secretKey) {
    throw new MyMindApiError("Missing access key. Set Key ID and Secret in extension preferences.", 401);
  }
  const raw = `${keyId}:${secretKey}`;
  if (cachedCredentials && cachedCredentials.raw === raw) {
    return cachedCredentials.resolved;
  }
  const resolved: ResolvedCredentials = {
    keyId,
    encodedHeader: Buffer.from(JSON.stringify({ alg: "HS256", kid: keyId })).toString("base64"),
    secretBytes: decodeSecret(secretKey),
  };
  cachedCredentials = { raw, resolved };
  return resolved;
}

function signRequestToken(path: string, method: string): string {
  const { encodedHeader, secretBytes } = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      method: method.toUpperCase(),
      path,
      iat: now,
      exp: now + TOKEN_LIFETIME_SECONDS,
    }),
  ).toString("base64");
  const data = `${encodedHeader}.${payload}`;
  const sig = createHmac("sha256", secretBytes).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function buildUrl(path: string, query?: RequestOptions["query"]): URL {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null) url.searchParams.append(key, String(v));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

async function parseError(response: Response): Promise<MyMindApiError> {
  const fallback = `HTTP ${response.status} ${response.statusText}`;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/problem+json")) {
    return new MyMindApiError(fallback, response.status);
  }
  try {
    const problem = (await response.json()) as {
      type?: string;
      title?: string;
      detail?: string;
    };
    const message = problem.detail ?? problem.title ?? fallback;
    return new MyMindApiError(message, response.status, problem.type, problem.detail);
  } catch {
    return new MyMindApiError(fallback, response.status);
  }
}

async function request(method: string, path: string, opts: RequestOptions = {}): Promise<Response> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${signRequestToken(url.pathname, method)}`,
    "User-Agent": USER_AGENT,
  };
  if (opts.accept) headers["Accept"] = opts.accept;

  let body: RequestInit["body"] | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else if (typeof opts.body === "string") {
      body = opts.body;
      headers["Content-Type"] = opts.contentType ?? "text/plain";
    } else if (opts.body instanceof ArrayBuffer || ArrayBuffer.isView(opts.body)) {
      body = opts.body as RequestInit["body"];
      headers["Content-Type"] = opts.contentType ?? "application/octet-stream";
    } else {
      body = JSON.stringify(opts.body);
      headers["Content-Type"] = opts.contentType ?? "application/json";
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
    signal: opts.signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }
  return response;
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

const JSON_ACCEPT = "application/json";

function withJsonAccept(opts?: RequestOptions): RequestOptions {
  return { ...opts, accept: opts?.accept ?? JSON_ACCEPT };
}

export const api = {
  async get<T>(path: string, opts?: RequestOptions): Promise<T> {
    const response = await request("GET", path, withJsonAccept(opts));
    return readJson<T>(response);
  },
  async getRaw(path: string, opts?: RequestOptions): Promise<Response> {
    return request("GET", path, opts);
  },
  async post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    const response = await request("POST", path, { ...withJsonAccept(opts), body });
    return readJson<T>(response);
  },
  async postRaw(path: string, body?: unknown, opts?: RequestOptions): Promise<Response> {
    return request("POST", path, { ...opts, body });
  },
  async patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    const response = await request("PATCH", path, { ...withJsonAccept(opts), body });
    return readJson<T>(response);
  },
  async put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    const response = await request("PUT", path, { ...withJsonAccept(opts), body });
    return readJson<T>(response);
  },
  async delete(path: string, opts?: RequestOptions): Promise<void> {
    await request("DELETE", path, withJsonAccept(opts));
  },
};
