import { CLIENT, PLATFORM, PRODUCTION_API_BASE, VERSION } from "./config";
import { getInstallId } from "./installId";
import { getSession } from "./session";
import { storageGet } from "./storage";

// Every request carries the standard client headers (APP_STANDARDS S2), injected here and
// nowhere else. The base URL can be overridden per install (LocalStorage "api_base") so a dev
// build can point at a local backend.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function resolveApiBase(): Promise<string> {
  const override = await storageGet<string>("api_base");
  return (override && override.replace(/\/$/, "")) || PRODUCTION_API_BASE;
}

export async function standardHeaders(): Promise<Record<string, string>> {
  const [installId, session] = await Promise.all([getInstallId(), getSession()]);
  return {
    "Content-Type": "application/json",
    Client: CLIENT,
    "x-platform": PLATFORM,
    "x-client-version": VERSION,
    "x-install-id": installId,
    ...(session ? { "User-Token": session.token } : {}),
  };
}

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = await resolveApiBase();
  const headers = { ...(await standardHeaders()), ...((init.headers as Record<string, string>) ?? {}) };
  return fetch(base + path, { ...init, headers });
}

// v2 convention: the HTTP status is the outcome and errors are {"error":{code,message}}.
export async function backendJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await backendFetch(path, init);
  if (res.ok) {
    if (res.status === 202 || res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  throw await toApiError(res);
}

export async function toApiError(res: Response): Promise<ApiError> {
  let code = "http_" + res.status;
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: unknown };
    const err = body?.error as { code?: unknown; message?: unknown } | string | undefined;
    if (err && typeof err === "object") {
      code = typeof err.code === "string" ? err.code : code;
      message = typeof err.message === "string" ? err.message : message;
    } else if (typeof err === "string") {
      message = err;
    }
  } catch {
    // non-JSON body — keep the generic message
  }
  return new ApiError(res.status, code, message);
}

export function userMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Could not reach GTD Brain — check your connection";
}
