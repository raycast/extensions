import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_SERVER_URL = "https://mcp-server.onecal.io/mcp";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export async function connectMcp(accessToken: string): Promise<Client> {
  const client = new Client({
    name: "raycast-onecal-unified-calendar",
    version: "0.1.0",
  });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  await client.connect(transport);
  return client;
}

export async function listTools(client: Client): Promise<McpTool[]> {
  const result = await client.listTools();
  return result.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

/**
 * ツール名は公式ドキュメントに正確な表記が無いため、名前の部分一致で解決する。
 * 全キーワードを含む最初のツールを返す。
 */
export function resolveTool(
  tools: McpTool[],
  keywords: string[][],
): string | undefined {
  for (const keywordSet of keywords) {
    const found = tools.find((t) => {
      const name = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return keywordSet.every((k) => name.includes(k));
    });
    if (found) {
      return found.name;
    }
  }
  return undefined;
}

/** tools/call の結果から中身のJSONを取り出す（structuredContent優先、無ければtext contentをparse） */
export async function callToolJson(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    const text = extractText(result.content);
    throw new Error(
      `MCP tool ${name} returned an error: ${text ?? "(no details)"}`,
    );
  }
  if (result.structuredContent !== undefined) {
    return result.structuredContent;
  }
  const text = extractText(result.content);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractText(content: unknown): string | undefined {
  if (!Array.isArray(content)) {
    return undefined;
  }
  const texts = content
    .filter(
      (c): c is { type: string; text: string } =>
        typeof c === "object" &&
        c !== null &&
        (c as { type?: string }).type === "text",
    )
    .map((c) => c.text);
  return texts.length > 0 ? texts.join("\n") : undefined;
}
