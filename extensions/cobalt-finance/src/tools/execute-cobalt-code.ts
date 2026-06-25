import { getPreferenceValues } from "@raycast/api";

import { authorize } from "../oauth";

interface Input {
  /**
   * JavaScript source to run inside the Cobalt sandbox. Has access to the
   * typed `cobalt.*` SDK scoped to the signed-in user (transactions,
   * accounts, recurring streams, portfolio, news, tickers). The sandbox
   * cannot supply or override the userId — it is captured server-side.
   *
   * Important: list endpoints return wrapper objects, not raw arrays.
   *   - cobalt.transactions.list(...)        → { transactions: [...] }
   *   - cobalt.accounts.list({ type?, subtype? }) → { accounts: [...] }  // Plaid type/subtype, e.g. {type:"depository",subtype:"savings"}
   *   - cobalt.recurring.list(...)           → { streams: [...] }
   *   - cobalt.snapshots.balances(...)       → { snapshots: [...] }
   *   - cobalt.brokerage.positions(...)      → { positions: [...] }
   * Always destructure or access the wrapper key before calling .map / .filter.
   *
   * Example:
   *   const { transactions, nextCursor, hasMore } = await cobalt.transactions.list({ limit: 10 });
   *   console.log(transactions.map(t => `${t.name} ${t.amount}`).join("\n"));
   */
  code: string;
}

interface McpTextContent {
  text: string;
  type: "text";
}

interface McpToolCallResult {
  content: McpTextContent[];
  isError?: boolean;
}

interface JsonRpcResponse {
  error?: { code: number; message: string };
  id: number | string;
  jsonrpc: "2.0";
  result?: McpToolCallResult;
}

/**
 * Streamable HTTP MCP returns either application/json (one shot) or
 * text/event-stream (SSE w/ progress notifications + final response).
 * For SSE the server keeps the connection open, so we cannot `r.text()`
 * — we have to read chunks ourselves, parse `data:` events, and stop on
 * the first JSON-RPC response that matches our request `id`.
 */
async function readMcpResponse(
  r: Response,
  expectedId: number | string,
): Promise<JsonRpcResponse> {
  const ct = r.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await r.json()) as JsonRpcResponse;
  }
  if (!r.body) {
    throw new Error(`MCP returned no body (content-type=${ct})`);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const dataLines = event
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice("data:".length).trim());
        if (dataLines.length === 0) {
          continue;
        }

        const payload = dataLines.join("\n");
        let msg: JsonRpcResponse;
        try {
          msg = JSON.parse(payload) as JsonRpcResponse;
        } catch {
          continue;
        }

        // Skip notifications (no `id`); only match our response.
        if (msg.id === expectedId) {
          return msg;
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel errors
    }
  }

  throw new Error("MCP stream ended without a matching response");
}

export default async function tool(input: Input): Promise<string> {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const token = await authorize(base);

  const requestId = Date.now();
  const r = await fetch(`${base}/api/mcp`, {
    body: JSON.stringify({
      id: requestId,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        arguments: { code: input.code },
        name: "cobalt_execute_code",
      },
    }),
    headers: {
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`MCP returned ${r.status}: ${body.slice(0, 500)}`);
  }

  const rpc = await readMcpResponse(r, requestId);

  if (rpc.error) {
    throw new Error(`MCP error ${rpc.error.code}: ${rpc.error.message}`);
  }

  const { result } = rpc;
  if (!result) {
    return "(no result)";
  }

  const text = result.content.map((c) => c.text).join("\n");
  if (result.isError) {
    return `Execution failed:\n${text}`;
  }
  return text || "(no output)";
}
