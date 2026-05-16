import { getAccessToken, MCP_URL, signOut } from "./auth";

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number | string;
  result: T;
}
interface JsonRpcError {
  jsonrpc: "2.0";
  id: number | string;
  error: { code: number; message: string; data?: unknown };
}
type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

interface McpToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

let nextId = 1;
let sessionId: string | undefined;
let initialized = false;

const PROTOCOL_VERSION = "2025-06-18";

async function postJsonRpc(
  method: string,
  params: object | undefined,
  accessToken: string,
): Promise<{ status: number; body: JsonRpcResponse<unknown>; sessionHeader?: string }> {
  const id = nextId++;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${accessToken}`,
    "MCP-Protocol-Version": PROTOCOL_VERSION,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const sessionHeader = res.headers.get("Mcp-Session-Id") ?? undefined;
  if (sessionHeader) sessionId = sessionHeader;

  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MCP request failed: ${res.status} ${text}`);
  }

  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const body = await readSseResponse<unknown>(res, id);
    return { status: res.status, body, sessionHeader };
  }
  const body = (await res.json()) as JsonRpcResponse<unknown>;
  return { status: res.status, body, sessionHeader };
}

async function readSseResponse<T>(res: Response, expectedId: number | string): Promise<JsonRpcResponse<T>> {
  const text = await res.text();
  // SSE events are blocks separated by blank lines; each block has lines like "data: {...}".
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const dataLines = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    if (dataLines.length === 0) continue;
    const payload = dataLines.join("\n");
    try {
      const parsed = JSON.parse(payload) as JsonRpcResponse<T>;
      if (parsed.id === expectedId) return parsed;
    } catch {
      // Skip non-JSON events (e.g. notifications).
    }
  }
  throw new Error("MCP server returned an SSE stream without a matching JSON-RPC response.");
}

class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function ensureInitialized(accessToken: string): Promise<void> {
  if (initialized) return;
  const init = await postJsonRpc(
    "initialize",
    {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      clientInfo: { name: "raycast-superhuman", version: "1.0.0" },
    },
    accessToken,
  );
  if ("error" in init.body) {
    throw new Error(`MCP initialize failed: ${init.body.error.message}`);
  }

  // Per spec, client must send notifications/initialized after handshake.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${accessToken}`,
    "MCP-Protocol-Version": PROTOCOL_VERSION,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }),
  }).catch(() => undefined);

  initialized = true;
}

function resetClient() {
  initialized = false;
  sessionId = undefined;
}

export async function callMcpTool<T = unknown>(name: string, args: object = {}): Promise<T> {
  const run = async (): Promise<T> => {
    const accessToken = await getAccessToken();
    await ensureInitialized(accessToken);
    const res = await postJsonRpc("tools/call", { name, arguments: args }, accessToken);
    if ("error" in res.body) {
      throw new Error(`Superhuman MCP error (${name}): ${res.body.error.message}`);
    }
    const result = res.body.result as McpToolResult;
    if (result.isError) {
      const message =
        result.content
          ?.map((c) => c.text)
          .filter(Boolean)
          .join("\n") || "Tool reported an error.";
      throw new Error(`Superhuman MCP error (${name}): ${message}`);
    }
    if (result.structuredContent !== undefined) return result.structuredContent as T;
    // Prefer parsed JSON if the server returned a JSON-stringified text block.
    const textBlock = result.content?.find((c) => c.type === "text" && c.text);
    if (textBlock?.text) {
      try {
        return JSON.parse(textBlock.text) as T;
      } catch {
        return textBlock.text as unknown as T;
      }
    }
    return result as unknown as T;
  };

  try {
    return await run();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      resetClient();
      await signOut();
      // Force a fresh authorize() on next call.
      return run();
    }
    throw err;
  }
}
