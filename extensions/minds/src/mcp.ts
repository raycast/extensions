import { getPreferenceValues } from "@raycast/api";

const MINDS_MCP_ENDPOINT = "https://getminds.ai/mcp";

type JsonRpcResponse<T> = {
  result?: T;
  error?: { code: number; message: string };
};

export type ToolResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

function decodePayload(raw: string): JsonRpcResponse<unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as JsonRpcResponse<unknown>;

  const payloads: JsonRpcResponse<unknown>[] = [];
  let data: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    } else if (line === "" && data.length) {
      payloads.push(JSON.parse(data.join("\n")) as JsonRpcResponse<unknown>);
      data = [];
    }
  }
  if (data.length) payloads.push(JSON.parse(data.join("\n")) as JsonRpcResponse<unknown>);
  return payloads.at(-1);
}

class MindsMcpClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private sessionId?: string;
  private nextId = 1;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.apiKey.trim()) throw new Error("Add a Minds API key in the extension preferences.");
    this.endpoint = MINDS_MCP_ENDPOINT;
    this.apiKey = preferences.apiKey.trim();
  }

  private async request<T>(method: string, params?: unknown, notification = false): Promise<T | undefined> {
    const body: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (!notification) body.id = this.nextId++;
    if (params !== undefined) body.params = params;

    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;

    const response = await fetch(this.endpoint, { method: "POST", headers, body: JSON.stringify(body) });
    const raw = await response.text();
    if (!response.ok) throw new Error(`Minds returned HTTP ${response.status}: ${raw.slice(0, 300)}`);
    this.sessionId = response.headers.get("mcp-session-id") ?? this.sessionId;
    if (notification && !raw.trim()) return undefined;

    const payload = decodePayload(raw) as JsonRpcResponse<T> | undefined;
    if (payload?.error) throw new Error(payload.error.message);
    return payload?.result;
  }

  async initialize() {
    await this.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "raycast-minds", version: "1.0.0" },
    });
    if (!this.sessionId) throw new Error("Minds did not return an MCP session ID.");
    await this.request("notifications/initialized", undefined, true);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.request<ToolResult>("tools/call", { name, arguments: args });
    if (!result) throw new Error("Minds returned an empty tool result.");
    if (result.isError) throw new Error(resultText(result) || `${name} failed.`);
    return result;
  }
}

export async function callMindsTool(name: string, args: Record<string, unknown>) {
  const client = new MindsMcpClient();
  await client.initialize();
  return client.callTool(name, args);
}

export function resultData(result: ToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent;
  const text = resultText(result);
  if (!text) return result;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function resultText(result: ToolResult): string {
  return (result.content ?? [])
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

export function findValue(root: unknown, keys: string[]): string {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [root];
  const seen = new Set<object>();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(key.toLowerCase()) && (typeof child === "string" || typeof child === "number")) {
        return String(child);
      }
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return "";
}

export function resultMarkdown(result: ToolResult): string {
  const data = resultData(result);
  const markdown = findValue(data, ["markdown", "summaryMarkdown", "summary_markdown"]);
  if (markdown) return markdown;
  if (typeof data === "string") return data;
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}
