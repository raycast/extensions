export interface Note {
  id: string;
  title: string;
  folder: string;
  updated?: string;
  created?: string;
  content?: string;
  snippet?: string;
}
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  note_count?: number;
}
export interface Result<T> {
  status: "success";
  data: T;
  meta?: { total?: number; page?: number; page_size?: number; query?: string };
}
export interface Connection {
  token: string;
  port: string;
}

export function validateConnection(config: Connection): Connection {
  if (!/^\d+$/.test(config.port) || Number(config.port) < 9200 || Number(config.port) > 9700) {
    throw new Error("Set a local API port between 9200 and 9700 in Extension Preferences.");
  }
  if (!config.token.trim() || /[\r\n]/.test(config.token)) {
    throw new Error("Set a valid API Token in Extension Preferences.");
  }
  return { port: String(Number(config.port)), token: config.token.trim() };
}
export function itemId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error("Invalid note or folder ID.");
  return encodeURIComponent(id);
}
export function positiveInt(value: number, max = 100): number {
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Expected a number between 1 and ${max}.`);
  return value;
}
export function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}
export function cleanHighlight(text: string): string {
  return text.replace(/<\/?em>/gi, "");
}

/** Never exposes response bodies, underlying fetch errors, or credentials in errors. */
export function createClient(config: Connection, transport: typeof fetch = fetch) {
  const { port, token } = validateConnection(config);
  return async function request<T>(
    path: string,
    options: { method?: "GET" | "POST" | "PUT"; body?: unknown; health?: boolean; signal?: AbortSignal } = {},
  ): Promise<Result<T>> {
    // Only explicit API paths; no arbitrary host, redirects, or path traversal.
    if (
      !/^\/(notes|folders|version)(?:[/?]|$)/.test(path) ||
      /[\\#]/.test(path) ||
      path.split("?")[0].split("/").includes("..")
    ) {
      throw new Error("Unsupported API path.");
    }
    const url = options.health ? `http://127.0.0.1:${port}/health` : `http://127.0.0.1:${port}/third-party${path}`;
    let response: Response;
    try {
      response = await transport(url, {
        method: options.method ?? "GET",
        redirect: "error",
        signal: options.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
        headers: {
          ...(options.health ? {} : { Authorization: `Bearer ${token}` }),
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new Error(
        "Cannot reach Office Suite. Keep the app running, enable CLI access, and check the port. If a write timed out, check the note before retrying.",
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new Error("Authentication failed. Update API Token in Extension Preferences.");
    if (response.status === 404) throw new Error("Note, folder, or API endpoint not found.");
    if (!response.ok)
      throw new Error(
        `Office Suite request failed (HTTP ${response.status}). For writes, check the note before retrying.`,
      );
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Office Suite returned invalid JSON.");
    }
    if (options.health) return { status: "success", data: payload as T };
    if (
      !payload ||
      typeof payload !== "object" ||
      !("status" in payload) ||
      payload.status !== "success" ||
      !("data" in payload)
    ) {
      throw new Error(
        "Office Suite rejected the request or returned an unsupported response. Check connection settings.",
      );
    }
    return payload as Result<T>;
  };
}
