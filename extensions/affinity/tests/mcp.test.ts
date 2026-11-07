import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { inspectDocuments } from "../src/lib/mcp";
import { INSPECT_SCRIPT } from "../src/lib/inspector";

test("real MCP SSE session reads preamble before the fixed inspection script, then closes", async () => {
  const calls: string[] = [];
  const transports = new Map<string, SSEServerTransport>();
  const clients: Server[] = [];
  const http = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", response);
      transports.set(transport.sessionId, transport);
      const server = new Server({ name: "affinity-test-fixture", version: "1.0.0" }, { capabilities: { tools: {} } });
      clients.push(server);
      server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
        { name: "read_sdk_documentation_topic", inputSchema: { type: "object", properties: { filename: { type: "string" } }, required: ["filename"] } },
        { name: "execute_script", inputSchema: { type: "object", properties: { script: { type: "string" } }, required: ["script"] } },
      ] }));
      server.setRequestHandler(CallToolRequestSchema, async (toolRequest) => {
        calls.push(toolRequest.params.name);
        if (toolRequest.params.name === "read_sdk_documentation_topic") {
          assert.equal(toolRequest.params.arguments?.filename, "preamble");
          return { content: [{ type: "text", text: "Fixture SDK preamble" }] };
        }
        assert.equal(calls[0], "read_sdk_documentation_topic");
        assert.equal(toolRequest.params.arguments?.script, INSPECT_SCRIPT);
        return { content: [{ type: "text", text: JSON.stringify({ result: JSON.stringify({ documents: [] }) }) }] };
      });
      await server.connect(transport);
    } else if (request.method === "POST" && url.pathname === "/messages") {
      const transport = transports.get(url.searchParams.get("sessionId") ?? "");
      if (transport) await transport.handlePostMessage(request, response);
      else { response.writeHead(404); response.end(); }
    } else { response.writeHead(404); response.end(); }
  });
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const address = http.address() as { port: number };
  try {
    const result = await inspectDocuments(undefined, [`http://127.0.0.1:${address.port}/sse`]);
    assert.deepEqual(result, { documents: [] });
    assert.deepEqual(calls, ["read_sdk_documentation_topic", "execute_script"]);
  } finally {
    await Promise.all(clients.map((client) => client.close()));
    http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  }
});

test("refuses remote or credential-bearing endpoints before opening a session", async () => {
  await assert.rejects(inspectDocuments(undefined, ["https://example.com/sse"]), /loopback/);
  await assert.rejects(inspectDocuments(undefined, ["http://name:secret@127.0.0.1:6767/sse"]), /loopback/);
});
