import { runAppleScript } from "@raycast/utils";
import { DEFAULT_MCP_PORT } from "./constants";

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: {
    isError?: boolean;
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { code: number; message: string };
}

export interface TranscribeArgs {
  file_path: string;
  format?: "text" | "srt" | "vtt" | "markdown" | "json";
  speakers?: boolean;
}

function buildUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

export async function isUp(port: number = DEFAULT_MCP_PORT): Promise<boolean> {
  try {
    await fetch(buildUrl(port), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "tools/list",
        params: {},
      }),
      signal: AbortSignal.timeout(500),
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureRunning(
  port: number = DEFAULT_MCP_PORT,
  timeoutMs = 8000,
): Promise<void> {
  if (await isUp(port)) return;
  try {
    await runAppleScript('do shell script "open -gj -a Spokenly"');
  } catch (err) {
    throw new Error(
      `Could not launch Spokenly: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    if (await isUp(port)) return;
  }
  throw new Error(
    "Spokenly's MCP server did not come up within 8s. Open Spokenly and try again.",
  );
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  port: number = DEFAULT_MCP_PORT,
): Promise<string> {
  const res = await fetch(buildUrl(port), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(600_000),
  });
  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) throw new Error(json.error.message);
  if (json.result?.isError) {
    const msg = json.result.content?.[0]?.text ?? "Unknown MCP error";
    throw new Error(msg);
  }
  return json.result?.content?.[0]?.text ?? "";
}

export async function transcribeFile(
  args: TranscribeArgs,
  port: number = DEFAULT_MCP_PORT,
): Promise<string> {
  await ensureRunning(port);
  return callTool(
    "transcribe_file",
    args as unknown as Record<string, unknown>,
    port,
  );
}
