import { describe, expect, it, vi } from "vitest";
import { SynciMcpClient } from "../src/lib/mcp-client";
import { MCP_URL } from "../src/lib/config";
import type { McpToolName } from "../src/lib/mcp-input";

type Rpc = { id?: number; method: string; params?: Record<string, unknown> };
function server(result: Record<string, unknown>, options: { sse?: boolean; textOnly?: boolean } = {}) {
  return vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
    if (init?.method === "GET") return new Response(null, { status: 405 });
    const request = JSON.parse(String(init?.body)) as Rpc;
    if (request.id === undefined) return new Response(null, { status: 202 });
    const body = {
      jsonrpc: "2.0",
      id: request.id,
      result:
        request.method === "initialize"
          ? {
              protocolVersion: "2025-06-18",
              capabilities: { tools: {} },
              serverInfo: { name: "Synthetic Synci", version: "1" },
            }
          : {
              content: [{ type: "text", text: JSON.stringify(result) }],
              ...(!options.textOnly ? { structuredContent: result } : {}),
            },
    };
    return options.sse && request.method === "tools/call"
      ? new Response(`event: message\ndata: ${JSON.stringify(body)}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        })
      : Response.json(body, { headers: { "mcp-session-id": "synthetic-session" } });
  });
}

describe("Synci MCP transport", () => {
  it("initializes MCP and calls only the selected read-only tool with shared OAuth", async () => {
    const data = { accounts: [{ id: "42", name: "Test Account", balance: { booked: "0", as_of: "2026-09-20" } }] };
    const transport = server(data);
    const token = vi.fn(async () => "test-secret-token");
    expect(await new SynciMcpClient(token, transport).call("list_accounts", { account_category: "BANK" })).toEqual(
      data,
    );
    expect(token).toHaveBeenCalledTimes(1);
    const calls = transport.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)) as Rpc);
    expect(calls.map((call) => call.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(calls.at(-1)?.params).toEqual({ name: "list_accounts", arguments: { account_category: "BANK" } });
    for (const [url, init] of transport.mock.calls) {
      expect(String(url)).toBe(MCP_URL);
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-secret-token");
      expect(String(init?.body)).not.toContain("test-secret-token");
      expect(init?.signal?.aborted).toBe(true); // SDK closes all streams after the call.
    }
    const headers = new Headers(
      transport.mock.calls.find(([, init]) => String(init?.body).includes('"tools/call"'))?.[1]?.headers,
    );
    expect(headers.get("mcp-protocol-version")).toBe("2025-06-18");
    expect(headers.get("mcp-session-id")).toBe("synthetic-session");
  });
  it.each([{ sse: true }, { textOnly: true }])("supports MCP stream/text compatibility: %j", async (options) => {
    const data = { holdings: [{ symbol: "TEST", quantity: "0.00000001", currency: "EUR" }] };
    expect(await new SynciMcpClient(async () => "token", server(data, options)).call("list_holdings")).toEqual(data);
  });
  it("preserves pagination and coverage metadata, including a rule-filtered empty page", async () => {
    const data = {
      meta: {
        from: "2026-09-01",
        to: "2026-09-25",
        has_more: true,
        next_cursor: "opaque-next",
        earliest_available_date: "2026-09-10",
      },
      data: [],
    };
    const transport = server(data);
    const input = {
      from: "2026-09-01",
      to: "2026-09-25",
      account_id: "42",
      cursor: "opaque-previous",
      status: "booked",
      date_field: "mapped",
      limit: 100,
    };
    expect(await new SynciMcpClient(async () => "token", transport).call("list_transactions", input)).toEqual(data);
    const request = transport.mock.calls
      .map(([, init]) => init?.body && JSON.parse(String(init.body)))
      .find((call) => call?.method === "tools/call");
    expect(request.params.arguments).toEqual(input);
  });
  it.each([
    [401, "Reconnect Synci"],
    [402, "subscription"],
    [403, "denied MCP access"],
    [429, "60 seconds"],
    [500, "HTTP 500"],
  ])("handles HTTP %i without exposing the response body or retrying", async (status, message) => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response("private upstream body", { status: Number(status), headers: { "retry-after": "60" } }),
      );
    await expect(new SynciMcpClient(async () => "secret", transport).call("list_connections")).rejects.toThrow(
      String(message),
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("preserves actionable MCP consent errors instead of reporting no accounts", async () => {
    const transport = server({});
    const original = transport.getMockImplementation()!;
    transport.mockImplementation(async (input, init) => {
      const request = init?.body ? (JSON.parse(String(init.body)) as Rpc) : undefined;
      if (request?.method === "tools/call")
        return Response.json({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            isError: true,
            content: [{ type: "text", text: "No accounts were granted. Reconnect and select accounts." }],
          },
        });
      return original(input, init);
    });
    await expect(new SynciMcpClient(async () => "token", transport).call("list_accounts")).rejects.toThrow(
      "Reconnect and select accounts",
    );
  });
  it.each([
    ["An active Synci subscription is required to use the MCP server.", "active subscription"],
    ["The access token does not have the required scope.", "mcp:use"],
  ])("distinguishes the server's 403 denial: %s", async (message, expected) => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ message }, { status: 403 }));
    await expect(new SynciMcpClient(async () => "token", transport).call("list_accounts")).rejects.toThrow(expected);
  });
  it("does not relay malformed responses, transport errors, or credential-bearing error messages", async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error("Bearer private-token: private upstream body"));
    await expect(new SynciMcpClient(async () => "private-token", transport).call("list_accounts")).rejects.toThrow(
      "Could not read a valid response",
    );
    transport.mockImplementation(async () => new Response("<html>private upstream body</html>"));
    await expect(new SynciMcpClient(async () => "private-token", transport).call("list_accounts")).rejects.toThrow(
      "Could not read a valid response",
    );
  });
  it("rejects unsupported tools and malformed input before reading credentials", async () => {
    const token = vi.fn(async () => "token");
    const transport = vi.fn<typeof fetch>();
    const client = new SynciMcpClient(token, transport);
    await expect(client.call("delete_account" as McpToolName, {})).rejects.toThrow("read-only");
    await expect(client.call("list_transactions", { limit: 101 })).rejects.toThrow("1 to 100");
    expect(token).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });
  it("honors cancellation without acquiring credentials", async () => {
    const token = vi.fn(async () => "token");
    await expect(new SynciMcpClient(token).call("list_accounts", {}, AbortSignal.abort())).rejects.toThrow();
    expect(token).not.toHaveBeenCalled();
  });
});
