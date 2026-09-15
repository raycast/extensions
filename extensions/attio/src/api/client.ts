import { logger } from "@chrismessina/raycast-logger";
import { getPreferenceValues } from "@raycast/api";
import { AttioApiError, AttioNetworkError, parseRetryAfter } from "./errors";

const log = logger.child("[API]");
const BASE = "https://api.attio.com";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { access_token } = getPreferenceValues<Preferences>();
  if (init?.body) {
    try {
      const parsed = JSON.parse(init.body as string) as { data?: unknown };
      const keys = Object.keys((parsed.data ?? parsed) as object);
      log.debug("payload keys", { keys });
    } catch {
      // non-JSON body: nothing worth logging
    }
  }
  const method = init?.method ?? "GET";
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (cause) {
    log.error("network failure", { path: path.split("?")[0] });
    throw new AttioNetworkError("Could not reach Attio", { cause });
  }
  const body = (await res.json().catch(() => null)) as
    | { status_code?: number; type?: string; code?: string; message?: string }
    | T
    | null;
  if (!res.ok) {
    const e = body as { type?: string; code?: string; message?: string } | null;
    const err = new AttioApiError(
      res.status,
      e?.type ?? "unknown",
      e?.code ?? "unknown",
      e?.message ?? `Attio returned ${res.status}`,
      parseRetryAfter(res.headers.get("retry-after")),
    );
    log.error("api error", { path: path.split("?")[0], status: res.status, code: err.code });
    throw err;
  }
  if (body === null && res.status !== 204 && (init?.method ?? "GET") !== "DELETE") {
    log.error("malformed response", { path: path.split("?")[0], status: res.status });
    throw new AttioApiError(res.status, "invalid_response", "malformed_json", "Attio returned an unreadable response");
  }
  const ms = Date.now() - started;
  const count =
    body !== null && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data.length
      : undefined;
  log.log(`${method} ${path.split("?")[0]} ${res.status} ${ms}ms${count !== undefined ? ` → ${count} items` : ""}`);
  return body as T;
}
