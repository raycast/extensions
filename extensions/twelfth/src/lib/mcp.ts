import { apiKey, authorize, NotSignedInError, signOut, storedToken } from "./auth";
import { MCP_URL } from "./config";

type JsonRpcResponse = {
  result?: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }>; isError?: boolean };
  error?: { code: number; message: string };
};

let nextId = 1;

/**
 * Call one Twelfth MCP tool and return its structured result.
 *
 * The endpoint is stateless JSON-RPC over POST, so there is no `initialize`
 * handshake to keep: each call stands alone. `interactive: false` is for
 * background callers, which must fail quietly rather than open a sign-in page.
 */
export async function callTool<T>(
  name: string,
  args: Record<string, unknown> = {},
  { interactive = true } = {},
): Promise<T> {
  const token = interactive ? await authorize() : await storedToken();
  if (!token) throw new NotSignedInError();

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } }),
  });

  if (response.status === 401) {
    // The connection was ended in Settings → AI & agents, or the key revoked.
    if (!apiKey()) await signOut();
    throw new Error(
      apiKey() ? "Twelfth rejected the workspace API key" : "Your Twelfth connection has ended. Sign in again.",
    );
  }
  if (response.status === 429) {
    throw new Error(
      `Twelfth is rate limiting requests. Try again in ${response.headers.get("retry-after") ?? "a minute"}s.`,
    );
  }
  if (!response.ok) throw new Error(`Twelfth returned ${response.status}`);

  const body = await readBody(response);
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

function notOffered(tool: string) {
  return `This connection can't use ${tool}. Your workspace may not have the feature, or the connection wasn't allowed it.`;
}

/** The server answers in JSON, but MCP lets it stream: take the last SSE frame if it does. */
async function readBody(response: Response): Promise<JsonRpcResponse> {
  const raw = await response.text();
  if (!(response.headers.get("content-type") ?? "").includes("text/event-stream")) return JSON.parse(raw);
  const frames = raw
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  return JSON.parse(frames[frames.length - 1] ?? "{}");
}
