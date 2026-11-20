// Pure MCP (Streamable HTTP, stateless JSON-RPC 2.0) client for the FirmLedger server.
// No Raycast imports here so it can be tested in plain Node.

export interface Config {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
}

export const DEFAULT_ENDPOINT = "https://mcp.firmledger.co.ke/mcp";

export class McpError extends Error {
  code: string;
  status?: number;
  details?: Record<string, unknown>;
  constructor(message: string, code = "error", status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type Args = Record<string, unknown>;

export interface ToolOutcome {
  summary: string;
  data: unknown;
  cancelled?: boolean;
}

let nextId = 1;

function parseSse(text: string): unknown {
  const events = text
    .split(/\r?\n\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n"),
    )
    .filter(Boolean);
  const last = events[events.length - 1];
  return last ? JSON.parse(last) : undefined;
}

export async function rpc<T = any>(cfg: Config, method: string, params?: unknown): Promise<T> {
  const endpoint = (cfg.endpoint || DEFAULT_ENDPOINT).trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (cfg.apiKey && cfg.apiKey.trim()) headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 45_000);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
      signal: controller.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new McpError(
      controller.signal.aborted ? "Request to FirmLedger timed out." : `Could not reach FirmLedger: ${msg}`,
      "network_error",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const ctype = res.headers.get("content-type") ?? "";
  let body: any;
  try {
    body = ctype.includes("text/event-stream") ? parseSse(text) : JSON.parse(text);
  } catch {
    const hint = /cloudflare|just a moment|challenge/i.test(text)
      ? " (Cloudflare challenge: use https://mcp.firmledger.co.ke/mcp as the endpoint.)"
      : "";
    throw new McpError(`FirmLedger returned a non-JSON response (HTTP ${res.status})${hint}`, "bad_response", res.status);
  }

  if (body?.error) {
    const data = body.error.data ?? {};
    throw new McpError(
      `${body.error.message ?? "FirmLedger error"}${data.reason ? ` (${data.reason})` : ""}`,
      data.reason ?? String(body.error.code ?? "rpc_error"),
      res.status,
      data,
    );
  }
  if (!res.ok) throw new McpError(`HTTP ${res.status}`, "http_error", res.status);
  return body?.result as T;
}

/** Drop undefined / null / empty-string values so optional args are omitted. */
export function cleanArgs(args: Args): Args {
  const out: Args = {};
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export async function callTool(cfg: Config, name: string, args: Args = {}): Promise<ToolOutcome> {
  const result = await rpc<any>(cfg, "tools/call", { name, arguments: cleanArgs(args) });
  const text: string = result?.content?.[0]?.text ?? "";
  let data: unknown = result?.structuredContent;
  if (data === undefined && text) {
    const start = text.search(/[[{]/);
    try {
      data = JSON.parse(start >= 0 ? text.slice(start) : text);
    } catch {
      data = text;
    }
  }
  if (result?.isError) {
    const err = ((data as any)?.error ?? {}) as Record<string, any>;
    throw new McpError(err.message ?? text ?? "Tool error", err.code ?? "tool_error", 200, err);
  }
  const trimmed = text.trim();
  const summary = trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("[") ? trimmed.split("\n")[0] : "";
  return { summary, data };
}

export interface ConfirmInfo {
  action: string;
  summary: string;
  details?: unknown;
}

/**
 * Runs a tool and performs the FirmLedger prepare → confirm → execute handshake when needed.
 * `confirm` must show action_summary to the human and resolve true only on an explicit yes.
 */
export async function callWithHandshake(
  cfg: Config,
  name: string,
  args: Args,
  confirm: (info: ConfirmInfo) => Promise<boolean>,
): Promise<ToolOutcome> {
  const first = await callTool(cfg, name, args);
  const d = first.data as any;
  if (d && typeof d === "object" && d.status === "confirmation_required" && d.confirmation_token) {
    const ok = await confirm({
      action: String(d.action ?? name),
      summary: String(d.action_summary ?? "Confirm this action?"),
      details: d.details,
    });
    if (!ok) return { summary: "Cancelled. Nothing was done.", data: { status: "cancelled", action: d.action ?? name }, cancelled: true };
    return callTool(cfg, name, { ...args, confirmation_token: d.confirmation_token });
  }
  return first;
}

export async function listRemoteTools(cfg: Config): Promise<{ name: string; description?: string }[]> {
  const r = await rpc<any>(cfg, "tools/list", {});
  return r?.tools ?? [];
}
