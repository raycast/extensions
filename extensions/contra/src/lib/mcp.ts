import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { forceReauthorize, getAccessToken } from "./oauth";

const MCP_URL = "https://contra.com/mcp";

/**
 * Calls a Contra MCP tool and returns its parsed JSON payload.
 *
 * Contra tools return their result as a single text content block containing
 * JSON. We connect a fresh session per call (cheap, and avoids stale-token /
 * dropped-stream issues across Raycast command launches). If the access token
 * is rejected (401), we refresh/re-auth once and retry — so a brief login
 * happens at most once per session, not on every command.
 */
export async function callTool<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  try {
    return await invoke<T>(name, args, await getAccessToken());
  } catch (err) {
    if (!isAuthError(err)) throw err;
    return invoke<T>(name, args, await forceReauthorize());
  }
}

async function invoke<T>(
  name: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const mcp = new Client(
    { name: "raycast-contra", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await mcp.connect(transport);
    const result = await mcp.callTool({ name, arguments: args });

    if (result.isError) {
      throw new Error(
        `Contra tool "${name}" errored: ${stringifyContent(result.content)}`,
      );
    }

    const text = firstText(result.content);
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } finally {
    await mcp.close().catch(() => undefined);
  }
}

/** Detects token-rejection errors so we can refresh and retry once. */
function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /401|unauthorized|invalid_token|invalid token|forbidden|403/i.test(
    msg,
  );
}

type ContentBlock = { type?: string; text?: string };

function firstText(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const block = (content as ContentBlock[]).find(
    (c) => c.type === "text" && typeof c.text === "string",
  );
  return block?.text;
}

function stringifyContent(content: unknown): string {
  if (!Array.isArray(content)) return String(content);
  return (content as ContentBlock[])
    .map((c) => c.text ?? JSON.stringify(c))
    .join(" ");
}
