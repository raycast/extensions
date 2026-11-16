import { AREG_URL } from "./constants";
import { parseOrgnr } from "./orgnr";

type ToolResult = {
  result?: { content: { type: string; text?: string }[]; isError?: boolean };
  error?: { message: string };
};

let nextId = 1;

/** Calls a tool on areg's public MCP server, which answers in Markdown. */
export async function callAregTool(name: string, args: Record<string, unknown>): Promise<string> {
  const cleaned = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined && value !== null));
  // Models often pass "923 609 016" or "NO923609016MVA"; the server wants nine digits.
  if (typeof cleaned.orgnr === "string") cleaned.orgnr = parseOrgnr(cleaned.orgnr) ?? cleaned.orgnr;
  const response = await fetch(`${AREG_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "areg-raycast",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextId++,
      method: "tools/call",
      params: { name, arguments: cleaned },
    }),
  });
  if (!response.ok) throw new Error(`areg MCP responded ${response.status}`);
  const body = (await response.json()) as ToolResult;
  if (body.error) throw new Error(body.error.message);
  const text = (body.result?.content ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (body.result?.isError) throw new Error(text || `areg tool ${name} failed`);
  return text;
}
