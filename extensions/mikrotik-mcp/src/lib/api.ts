/**
 * Dashboard API client — thin fetch helpers shared by every command.
 *
 * Mirrors `ui/observability/api.ts`, but the base URL and bearer token come from
 * the extension **preferences** (not `location`), and paths are resolved against
 * that base. The token is forwarded as an `Authorization: Bearer` header on
 * fetches, and as a `?token=` query param on links / downloads / WebSocket / SSE
 * URLs (which can't set a header) — exactly the dashboard's own convention.
 *
 * `api()` and `deleteEvents()` throw on a non-2xx response. `postJson()` and
 * `deleteJson()` deliberately DO NOT throw — the config / modules / backups
 * routes reply with a structured `{ ok, error }` body on failure, so callers
 * inspect the parsed body rather than the HTTP status.
 */
import { getPreferenceValues } from "@raycast/api";

function cfg(): { base: string; token: string } {
  const { dashboardUrl, token } = getPreferenceValues<Preferences>();
  return { base: (dashboardUrl ?? "").replace(/\/+$/, ""), token: token ?? "" };
}

function authHeaders(token: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Absolute URL to a dashboard path, with the token as a query param. */
export function withToken(path: string): string {
  const { base, token } = cfg();
  const url = `${base}${path}`;
  if (!token) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

/** Absolute ws:// or wss:// URL for a streaming path, with the token query param. */
export function wsUrl(path: string): string {
  const url = withToken(path);
  if (url.startsWith("https:")) return `wss:${url.slice("https:".length)}`;
  if (url.startsWith("http:")) return `ws:${url.slice("http:".length)}`;
  return url;
}

/** GET a JSON resource, forwarding the token; throws on a non-2xx response. */
export async function api<T>(path: string): Promise<T> {
  const { base, token } = cfg();
  const res = await fetch(`${base}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** POST JSON; returns the parsed JSON body even on non-2xx (routes reply `{ ok, error }`). */
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const { base, token } = cfg();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}

/** DELETE with a JSON body; returns the parsed JSON body even on non-2xx. */
export async function deleteJson<T>(path: string, body: unknown): Promise<T> {
  const { base, token } = cfg();
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}

/** Delete recorded events: a list of ids, or everything (`{ all: true }`). Throws on failure. */
export async function deleteEvents(body: {
  ids?: string[];
  all?: boolean;
}): Promise<{ removed: number; total: number }> {
  const { base, token } = cfg();
  const res = await fetch(`${base}/api/events`, {
    method: "DELETE",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as { removed: number; total: number };
}
