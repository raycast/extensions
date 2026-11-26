// Minimal authenticated JSON/text HTTP helper with one forced token refresh on 401. Pure.

import { ApiError } from "./types";
import { TokenProvider } from "./gcloud";

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  accept?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; body: string };

/** One request; the timeout covers reading the body too, so a stalled response cannot hang. */
async function attempt<T>(
  url: string,
  token: string,
  opts: RequestOptions,
  read: (res: Response) => Promise<T>,
): Promise<Outcome<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: opts.accept ?? "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, body: await res.text().catch(() => "") };
    return { ok: true, value: await read(res) };
  } catch (e) {
    if (controller.signal.aborted && !opts.signal?.aborted) {
      throw new ApiError(`Request timed out after ${opts.timeoutMs ?? 30_000} ms`, 0, url);
    }
    throw e;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
function describeFailure(status: number, body: string): string {
  if (status === 401)
    return "401 Unauthorized - token rejected. Run `gcloud auth login` (access token, not identity token).";
  if (status === 403) {
    if (/SERVICE_DISABLED|has not been used in project|is disabled/i.test(body))
      return "403 Forbidden - the API is not enabled in this project (enable it from the Service Hub or the console).";
    return "403 Forbidden - your account lacks composer.user (or similar) on this environment. This is an IAM/group gap; re-authenticating will not help.";
  }
  if (status === 404) return "404 Not Found";
  const trimmed = body.trim();
  if (trimmed.startsWith("<")) return `HTTP ${status} (HTML error page)`;
  try {
    const j = JSON.parse(trimmed);
    const msg = j?.error?.message ?? j?.detail ?? j?.title ?? j?.message;
    if (msg) return `HTTP ${status}: ${msg}`;
  } catch {
    // not JSON
  }
  return `HTTP ${status}: ${trimmed.slice(0, 200)}`;
}

async function send<T>(
  tokens: TokenProvider,
  url: string,
  opts: RequestOptions,
  read: (res: Response) => Promise<T>,
): Promise<T> {
  let out = await attempt(url, await tokens.get(), opts, read);
  if (!out.ok && out.status === 401) out = await attempt(url, await tokens.get(true), opts, read);
  if (!out.ok) throw new ApiError(describeFailure(out.status, out.body), out.status, url, out.body.slice(0, 2000));
  return out.value;
}

export function requestJson<T>(tokens: TokenProvider, url: string, opts: RequestOptions = {}): Promise<T> {
  return send(tokens, url, opts, async (res) => (await res.json()) as T);
}

/** Text body plus the response content type (task logs come back as text or JSON). */
export function requestText(
  tokens: TokenProvider,
  url: string,
  opts: RequestOptions = {},
): Promise<{ text: string; contentType: string }> {
  return send(tokens, url, opts, async (res) => ({
    text: await res.text(),
    contentType: res.headers.get("content-type") ?? "",
  }));
}

/** Build a query string, skipping undefined values and repeating array values. */
export function qs(params: Record<string, string | number | boolean | undefined | (string | number)[]>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Percent-encode a path segment. Run ids contain '+' and ':' and 404 unencoded. */
export function seg(s: string): string {
  return encodeURIComponent(s);
}
