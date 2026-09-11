import { getPreferenceValues } from "@raycast/api";
import { parseEventStream } from "./sse";

const MCP_URL = "https://api.val.town/v3/mcp";

export class McpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "McpError";
    this.status = status;
  }
}

let requestId = 0;

type JsonRpcResponse = {
  result?: unknown;
  error?: { message?: string; code?: number };
};

async function rpc(method: string, params: unknown, signal?: AbortSignal): Promise<unknown> {
  const { apiToken } = getPreferenceValues<Preferences>();
  const id = ++requestId;

  let response: Response;
  try {
    response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new McpError("Could not reach Val Town. Check your connection.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new McpError("Val Town rejected your API token. Check it in extension preferences.", response.status);
  }

  const body = await response.text();

  if (response.status >= 500) {
    throw new McpError(
      `Val Town's API is having trouble (HTTP ${response.status}). Try again shortly.`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new McpError(body.slice(0, 400) || `Val Town returned ${response.status}`, response.status);
  }

  const envelope = parseEventStream(body, id) as JsonRpcResponse;
  if (envelope.error) throw new McpError(envelope.error.message ?? "Val Town returned an error");
  return envelope.result;
}

type ToolCallResult = {
  content?: { type: string; text?: string }[];
  /** The machine-readable result. The text part can be prose (get_val_detail's is), this cannot. */
  structuredContent?: unknown;
  isError?: boolean;
};

export async function callTool<T>(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const result = await callToolResult(name, args, signal);

  if (result.structuredContent !== undefined) return result.structuredContent as T;

  const text = result.content?.find((part) => part.type === "text")?.text ?? "";
  // Handing back undefined here renders as an empty view with nothing to explain it.
  if (!text) throw new McpError(`${name} returned nothing`);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new McpError(`${name} answered with something other than JSON: ${text.slice(0, 200)}`);
  }
}

/** For a tool whose success is an empty response, where no body is the expected answer. */
export async function callToolVoid(name: string, args: Record<string, unknown> = {}): Promise<void> {
  await callToolResult(name, args);
}

async function callToolResult(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolCallResult> {
  const result = (await rpc("tools/call", { name, arguments: args }, signal)) as ToolCallResult;
  if (result.isError) {
    const text = result.content?.find((part) => part.type === "text")?.text ?? "";
    throw new McpError(extractErrorMessage(text) ?? `${name} failed`);
  }
  return result;
}

function extractErrorMessage(text: string): string | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? text;
  } catch {
    return text;
  }
}
