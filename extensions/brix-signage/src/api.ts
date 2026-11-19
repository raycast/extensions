import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * One base URL serves every region: the API picks the region from the key
 * itself (`ak_us_…`, `ak_eu_…`).
 */
export const API_BASE = "https://api.brixsignage.com";
export const CONSOLE_BASE = "https://cms.brixsignage.com";

export class BrixError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

function apiKey(): string {
  return getPreferenceValues<Preferences>().apiKey.trim();
}

/**
 * A non-secret id for the API key. Data hooks put it in their arguments, so
 * each key (workspace) has its own cache, and a new key never shows the lists
 * of the old one.
 */
export function accountId(): string {
  return createHash("sha256").update(apiKey()).digest("hex").slice(0, 12);
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    Accept: "application/json",
    "X-Brix-Client": "raycast",
    "X-Brix-Process": `raycast/${environment.entryPointName}`,
    ...extra,
  };
}

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** Turn a Brix error body into a message a person can act on. */
async function toError(res: Response): Promise<BrixError> {
  let code: string | null = null;
  let message: string | null = null;
  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === "string") code = body.error;
    if (typeof body.message === "string" && body.message.trim()) message = sentence(body.message.trim());
  } catch {
    // Not JSON: keep the status only.
  }
  const detail = message ? ` ${message}` : "";
  switch (res.status) {
    case 401:
      return new BrixError(
        `Brix did not accept the API key.${detail} Make a new key in Brix in Settings › AI, API & MCP, then enter it in the extension preferences.`,
        401,
        code,
      );
    case 403:
      return new BrixError(
        `Brix refused this action.${detail} Ask a workspace owner for an API key with the correct permission.`,
        403,
        code,
      );
    case 404:
      return new BrixError(`Brix did not find the item.${detail}`, 404, code);
    case 429:
      return new BrixError("Brix received too many requests. Try again in a minute.", 429, code);
    default:
      return new BrixError(
        res.status >= 500
          ? `Brix had a problem (HTTP ${res.status}).${detail} Try again in a few minutes.`
          : `Brix could not do this.${detail || ` HTTP ${res.status}.`}`,
        res.status,
        code,
      );
  }
}

export function apiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, API_BASE);
  // The key goes only to the Brix API. A path is always relative to it.
  if (url.origin !== new URL(API_BASE).origin) throw new BrixError("Brix sent a link to another site.", 0, null);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Read the `{ data }` envelope that almost every Brix route answers with. */
export async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(apiUrl(path, params), { headers: headers(), signal });
  if (!res.ok) throw await toError(res);
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** A keyset-paged list (`?limit` + `?cursor` → `{ data, nextCursor }`). */
export async function getPage<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<{ data: T[]; nextCursor: string | null }> {
  const res = await fetch(apiUrl(path, params), { headers: headers(), signal });
  if (!res.ok) throw await toError(res);
  const body = (await res.json()) as { data: T[]; nextCursor?: string | null };
  return { data: body.data ?? [], nextCursor: body.nextCursor ?? null };
}

export async function sendJson<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: headers({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { data: T };
  return json.data;
}

/**
 * Images from the API need the key, and Raycast cannot send a header for an
 * image in markdown. So the image is saved to the extension's support folder
 * and shown from there. Returns its file URL (valid on macOS and Windows), or
 * null when there is no image (yet).
 */
export async function cacheImage(path: string, name: string): Promise<string | null> {
  const url = new URL(path, API_BASE);
  // Only the Brix API gets the key. An image on another host is fetched without it.
  const ours = url.origin === new URL(API_BASE).origin;
  const res = await fetch(url.toString(), { headers: ours ? headers({ Accept: "image/*" }) : { Accept: "image/*" } });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw await toError(res);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const dir = join(environment.supportPath, "images");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return pathToFileURL(file).href;
}

export const consoleUrl = {
  screen: (id: string) => `${CONSOLE_BASE}/screens?screen=${encodeURIComponent(id)}`,
  screens: () => `${CONSOLE_BASE}/screens`,
  file: (id: string) => `${CONSOLE_BASE}/media?asset=${encodeURIComponent(id)}`,
  playlist: (id: string) => `${CONSOLE_BASE}/content/playlists/${encodeURIComponent(id)}`,
};

/**
 * Data hooks pass `accountId()` as their first argument, so each key keeps its
 * own cache. This checks the key did not change while the hook waited.
 */
export function sameAccount(account: string): void {
  if (account !== accountId()) throw new BrixError("The API key changed. Run the command again.", 0, null);
}
