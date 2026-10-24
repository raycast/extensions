import { MCP_PROTOCOL_VERSION } from "./config";
import { AuthError, NotSignedInError, RateLimitedError, ToolUnavailableError } from "./errors";
import type { Session } from "./session";
import { sseReply } from "./sse";
import type { CallOptions } from "./types";

type JsonRpcResponse = {
  id?: number | string | null;
  result?: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }>; isError?: boolean };
  error?: { code: number; message: string };
};

export type McpClientOptions = {
  url: string;
  session: Pick<Session, "apiKey" | "authorize" | "forceRefresh" | "reconnect" | "storedToken">;
  /** What to tell the person when Twelfth refuses their workspace key, and where to fix it. */
  keyRejectedMessage?: string;
};

const TIMEOUT_MS = 20_000;
const TRANSIENT = new Set([502, 503, 504]);

/**
 * A client for Twelfth's MCP endpoint. The endpoint is stateless JSON-RPC over
 * POST, so there is no `initialize` handshake to keep: each call stands alone.
 */
export function createMcpClient(options: McpClientOptions) {
  const { session } = options;
  let nextId = 1;

  /**
   * One JSON-RPC request, authenticated: the 401 dance (shared refresh, then
   * reconnect for a person at the keyboard), 429 and HTTP errors handled
   * here. `interactive: false` is for background callers, which must fail
   * quietly rather than open a sign-in window.
   */
  async function rpc(
    method: string,
    params: Record<string, unknown>,
    callOptions: CallOptions,
  ): Promise<JsonRpcResponse> {
    const interactive = callOptions.interactive ?? true;
    const retry = callOptions.retry ?? true;
    const token = interactive ? await session.authorize() : await session.storedToken();
    if (!token) throw new NotSignedInError();

    let { response, id } = await post(token, method, params, retry);
    if (response.status === 401 && !session.apiKey()) {
      // Another request may already have refreshed or reconnected while this
      // one was in flight; use its token. Otherwise the refused token may only
      // be stale: one refresh before giving up. A refresh that fails for a
      // passing reason (timeout, 5xx) throws here and keeps the session.
      const current = await session.storedToken();
      const next = current && current !== token ? current : await session.forceRefresh();
      if (next && next !== token) ({ response, id } = await post(next, method, params, retry));
    }
    if (response.status === 401) {
      if (session.apiKey())
        throw new AuthError(options.keyRejectedMessage ?? "Twelfth rejected the workspace API key.");
      // The connection was ended in Settings → AI & agents. A person at the
      // keyboard signs in again (one window, however many requests failed); a
      // background caller is told.
      if (interactive) {
        await session.reconnect();
        return rpc(method, params, { ...callOptions, interactive: false });
      }
      throw new NotSignedInError("Your Twelfth connection has ended. Sign in again.");
    }
    if (response.status === 429) {
      const wait = Number(response.headers.get("retry-after"));
      throw new RateLimitedError(Number.isFinite(wait) && wait > 0 ? wait : undefined);
    }
    if (!response.ok) throw new Error(`Twelfth returned ${response.status}`);
    return readBody(response, id);
  }

  /** Call one Twelfth MCP tool and return its structured result. */
  async function callTool<T>(
    name: string,
    args: Record<string, unknown> = {},
    callOptions: CallOptions = {},
  ): Promise<T> {
    const body = await rpc("tools/call", { name, arguments: args }, callOptions);
    if (body.error) {
      if (body.error.code === -32602) throw new ToolUnavailableError(name);
      throw new Error(body.error.message);
    }
    const result = body.result;
    const text = result?.content?.find((item) => item.type === "text")?.text;
    if (result?.isError) {
      const reason = (result.structuredContent as { error?: string } | undefined)?.error ?? text;
      throw new Error(reason || `${name} failed`);
    }
    if (result?.structuredContent !== undefined) return result.structuredContent as T;
    if (text) return JSON.parse(text) as T;
    throw new Error(`${name} returned nothing`);
  }

  /**
   * The tools this connection is offered right now. What a person allowed
   * (the read tools they ticked, "Allow changes") shows up here, so a client
   * checks it after signing in rather than assuming.
   */
  async function listToolNames(callOptions: CallOptions = {}): Promise<string[]> {
    const body = await rpc("tools/list", {}, callOptions);
    if (body.error) throw new Error(body.error.message);
    const tools = (body.result as { tools?: Array<{ name?: unknown }> } | undefined)?.tools ?? [];
    return tools.map((tool) => tool.name).filter((name): name is string => typeof name === "string");
  }

  /** One POST, retried once on a timeout, network failure or gateway error unless `retry` is false. */
  async function post(token: string, method: string, params: Record<string, unknown>, retry: boolean) {
    const id = nextId++;
    const attempt = () =>
      fetch(options.url, {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": MCP_PROTOCOL_VERSION,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      });
    let response: Response;
    try {
      response = await attempt();
      if (retry && TRANSIENT.has(response.status)) response = await attempt();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      const failure = () =>
        new Error(timedOut ? "Twelfth took too long to answer." : "Couldn't reach Twelfth. Check your connection.");
      if (!retry) throw failure();
      try {
        response = await attempt();
      } catch {
        throw failure();
      }
    }
    return { response, id };
  }

  return { callTool, listToolNames };
}

/** The server answers in JSON, but MCP lets it stream: then the reply is the event carrying our request id. */
async function readBody(response: Response, id: number): Promise<JsonRpcResponse> {
  const raw = await response.text();
  if (!(response.headers.get("content-type") ?? "").includes("text/event-stream")) return JSON.parse(raw);
  const reply = sseReply<JsonRpcResponse>(raw, id);
  if (!reply) throw new Error("Twelfth's reply was empty.");
  return reply;
}
