import { AuthError, apiKey, authorize, forceRefresh, NotSignedInError, reconnect, storedToken } from "./auth";
import { MCP_URL } from "./config";
import { sseReply } from "./sse";

type JsonRpcResponse = {
  id?: number | string | null;
  result?: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }>; isError?: boolean };
  error?: { code: number; message: string };
};

type CallOptions = { interactive?: boolean };

const TIMEOUT_MS = 20_000;
const TRANSIENT = new Set([502, 503, 504]);

let nextId = 1;

/**
 * Call one Twelfth MCP tool and return its structured result.
 *
 * The endpoint is stateless JSON-RPC over POST, so there is no `initialize`
 * handshake to keep: each call stands alone. `interactive: false` is for
 * background callers, which must fail quietly rather than open a sign-in page.
 */
export async function callTool<T>(name: string, args: Record<string, unknown> = {}, options: CallOptions = {}) {
  const interactive = options.interactive ?? true;
  const token = interactive ? await authorize() : await storedToken();
  if (!token) throw new NotSignedInError();

  let { response, id } = await post(token, name, args);
  if (response.status === 401 && !apiKey()) {
    // Another request may already have refreshed or reconnected while this
    // one was in flight; use its token. Otherwise the refused token may only
    // be stale: one refresh before giving up. A refresh that fails for a
    // passing reason (timeout, 5xx) throws here and keeps the session.
    const current = await storedToken();
    const next = current && current !== token ? current : await forceRefresh();
    if (next && next !== token) ({ response, id } = await post(next, name, args));
  }
  if (response.status === 401) {
    if (apiKey())
      throw new AuthError("Twelfth rejected the workspace API key. Check it in the extension's preferences.");
    // The connection was ended in Settings → AI & agents. A person at the
    // keyboard signs in again (one window, however many requests failed); a
    // background caller is told.
    if (interactive) {
      await reconnect();
      return callTool<T>(name, args, { interactive: false });
    }
    throw new NotSignedInError("Your Twelfth connection has ended. Sign in again.");
  }
  if (response.status === 429) {
    const wait = response.headers.get("retry-after");
    throw new Error(`Twelfth is busy. Try again in ${wait ? `${wait}s` : "a minute"}.`);
  }
  if (!response.ok) throw new Error(`Twelfth returned ${response.status}`);

  const body = await readBody(response, id);
  if (body.error) {
    throw new Error(body.error.code === -32602 ? notOffered(name) : body.error.message);
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

/** One POST, retried once on a timeout, network failure or gateway error: every call here is a read. */
async function post(token: string, name: string, args: Record<string, unknown>) {
  const id = nextId++;
  const attempt = () =>
    fetch(MCP_URL, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }),
    });
  let response: Response;
  try {
    response = await attempt();
    if (TRANSIENT.has(response.status)) response = await attempt();
  } catch (error) {
    try {
      response = await attempt();
    } catch {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new Error(timedOut ? "Twelfth took too long to answer." : "Couldn't reach Twelfth. Check your connection.");
    }
  }
  return { response, id };
}

function notOffered(tool: string) {
  return `This connection can't use ${tool}. Your workspace may not have the feature, or the connection wasn't allowed it.`;
}

/** The server answers in JSON, but MCP lets it stream: then the reply is the event carrying our request id. */
async function readBody(response: Response, id: number): Promise<JsonRpcResponse> {
  const raw = await response.text();
  if (!(response.headers.get("content-type") ?? "").includes("text/event-stream")) return JSON.parse(raw);
  const reply = sseReply<JsonRpcResponse>(raw, id);
  if (!reply) throw new Error("Twelfth's reply was empty.");
  return reply;
}
