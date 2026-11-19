import { environment, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
  return getPreferenceValues<{ apiKey: string }>().apiKey.trim();
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    Accept: "application/json",
    "X-Brix-Client": "raycast",
    "X-Brix-Process": `raycast/${environment.commandName}`,
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
 * and shown from there. Returns null when there is no image (yet).
 */
export async function cacheImage(path: string, name: string): Promise<string | null> {
  const res = await fetch(apiUrl(path), { headers: headers({ Accept: "image/*" }) });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw await toError(res);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const dir = join(environment.supportPath, "images");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

export const consoleUrl = {
  screen: (id: string) => `${CONSOLE_BASE}/screens?screen=${encodeURIComponent(id)}`,
  screens: () => `${CONSOLE_BASE}/screens`,
  file: (id: string) => `${CONSOLE_BASE}/media?asset=${encodeURIComponent(id)}`,
  playlist: (id: string) => `${CONSOLE_BASE}/content/playlists/${encodeURIComponent(id)}`,
};

/** An `onError` for data hooks: one failure toast with the Brix message. */
export function failToast(title: string) {
  return (error: Error) => {
    void showFailureToast(error, { title });
  };
}
