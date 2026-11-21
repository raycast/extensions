import { randomUUID } from "node:crypto";
import { createServer, IncomingMessage, Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AmplenoteAuthError, AmplenoteUnavailableError, createToolCaller } from "../src/lib/mcp";

describe("createToolCaller errors", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    server = createServer((_, response) => {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("reports a rejected token as an auth error", async () => {
    await expect(createToolCaller(url, "wrong")("getTags")).rejects.toBeInstanceOf(AmplenoteAuthError);
  });

  it("reports a server that is not running as unavailable", async () => {
    await expect(createToolCaller("http://127.0.0.1:1/mcp", "token")("getTags")).rejects.toBeInstanceOf(
      AmplenoteUnavailableError,
    );
  });
});

/**
 * A minimal MCP server that keeps sessions like Amplenote does. `restart()` forgets all sessions,
 * so the next request with an old session id gets a 404.
 */
async function startSessionServer() {
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  let toolCalls = 0;

  const readBody = async (request: IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
  };

  const server = createServer(async (request, response) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const body = await readBody(request);
    let transport = sessionId ? sessions.get(sessionId) : undefined;
    if (sessionId && !transport) {
      response.writeHead(404).end("Session not found");
      return;
    }
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (id) => void sessions.set(id, transport!),
      });
      const mcp = new McpServer({ name: "fake-amplenote", version: "1.0.0" });
      mcp.tool("getTags", async () => {
        toolCalls += 1;
        return { content: [{ type: "text", text: JSON.stringify({ tags: [{ text: "work" }] }) }] };
      });
      await mcp.connect(transport);
    }
    await transport.handleRequest(request, response, body);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
    restart: () => sessions.clear(),
    toolCalls: () => toolCalls,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

describe("createToolCaller sessions", () => {
  it("reconnects and retries once when Amplenote has forgotten the session", async () => {
    const server = await startSessionServer();
    try {
      const call = createToolCaller(server.url, "token");
      expect(await call("getTags")).toEqual({ tags: [{ text: "work" }] });

      server.restart();

      expect(await call("getTags")).toEqual({ tags: [{ text: "work" }] });
      expect(server.toolCalls()).toBe(2);
    } finally {
      await server.close();
    }
  });
});
