import { RequestInit, Response } from "node-fetch";
import { describe, expect, it, vi } from "vitest";
import { createTanaMcpClient } from "./TanaAPIClient";
import { isTanaClientError } from "./errors";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("createTanaMcpClient", () => {
  it("reads and validates health without sending authorization", async () => {
    let requestUrl: string | undefined;
    let requestInit: RequestInit | undefined;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return jsonResponse({ status: "ok", timestamp: "2026-06-22T00:00:00.000Z", nodeSpaceReady: true });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await expect(client.health()).resolves.toMatchObject({ status: "ok", nodeSpaceReady: true });
    expect(requestUrl).toBe("http://127.0.0.1:8262/health");
    expect(requestInit?.headers).toBeUndefined();
  });

  it("uses unique JSON-RPC IDs and parses tools/list", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return jsonResponse({ jsonrpc: "2.0", id: "response", result: { tools: [{ name: "list_workspaces" }] } });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await client.listTools();
    await client.listTools();

    expect(bodies[0]?.method).toBe("tools/list");
    expect(bodies[0]?.id).not.toBe(bodies[1]?.id);
  });

  it("parses event-stream MCP responses", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response('event: message\ndata: {"jsonrpc":"2.0","id":"1","result":{"tools":[]}}\n\n', {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await expect(client.listTools()).resolves.toEqual([]);
  });

  it("classifies authorization and tool errors without leaking the token", async () => {
    const token = "top-secret-token";
    const authClient = createTanaMcpClient({
      token,
      workspaceId: "workspace",
      fetch: async () => jsonResponse({ message: token }, 401),
    });
    const toolClient = createTanaMcpClient({
      token,
      workspaceId: "workspace",
      fetch: async () =>
        jsonResponse({
          jsonrpc: "2.0",
          id: "1",
          result: { isError: true, content: [{ type: "text", text: `failed ${token}` }] },
        }),
    });

    await expect(authClient.listTools()).rejects.toMatchObject({ kind: "auth", status: 401 });
    try {
      await toolClient.callTool("check_node", { nodeId: "node" });
      throw new Error("expected tool call to fail");
    } catch (error) {
      expect(isTanaClientError(error)).toBe(true);
      expect(String(error)).not.toContain(token);
      expect(error).toMatchObject({ kind: "tool" });
    }
  });

  it("classifies a non-JSON authorization response before parsing its body", async () => {
    const client = createTanaMcpClient({
      token: "secret",
      workspaceId: "workspace",
      fetch: async () => new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain" } }),
    });

    await expect(client.listTools()).rejects.toMatchObject({ kind: "auth", status: 401 });
  });

  it("imports Quick Add into the deterministic inbox and returns the created node ID", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return jsonResponse({
        jsonrpc: "2.0",
        id: "1",
        result: {
          content: [{ type: "text", text: "created" }],
          structuredContent: { createdNodes: [{ nodeId: "created-node", name: "Capture" }] },
        },
      });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: " workspace ", fetch: fetcher });

    await expect(client.createNode({ name: "Capture", supertags: [{ id: "tag" }] }, "INBOX")).resolves.toEqual({
      createdNodes: [{ nodeId: "created-node", name: "Capture" }],
    });
    expect(requestBody?.params).toEqual({
      name: "import_tana_paste",
      arguments: { parentNodeId: "workspace_CAPTURE_INBOX", content: "- Capture #[[^tag]]" },
    });
  });

  it("parses created node IDs from the current Tana human-readable import result", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: "1",
        result: {
          content: [
            {
              type: "text",
              text: 'Successfully imported 1 node(s) under "Inbox"\n\nTarget container: inbox\nCreated nodes:\n- live-node-id ("中文 🧪")',
            },
          ],
        },
      }),
    );
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await expect(client.createNode({ name: "中文 🧪" }, "INBOX")).resolves.toEqual({
      createdNodes: [{ nodeId: "live-node-id", name: "中文 🧪" }],
    });
  });

  it("preserves every result across 100 serial Quick Add requests", async () => {
    let requestNumber = 0;
    const fetcher = vi.fn(async () => {
      requestNumber += 1;
      return jsonResponse({
        jsonrpc: "2.0",
        id: String(requestNumber),
        result: {
          content: [{ type: "text", text: "created" }],
          structuredContent: {
            createdNodes: [{ nodeId: `node-${requestNumber}`, name: `Capture ${requestNumber}` }],
          },
        },
      });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });
    const createdIds: string[] = [];

    for (let index = 1; index <= 100; index += 1) {
      const result = await client.createNode({ name: `Capture ${index}` }, "INBOX");
      createdIds.push(result.createdNodes[0]?.nodeId ?? "");
    }

    expect(fetcher).toHaveBeenCalledTimes(100);
    expect(createdIds).toHaveLength(100);
    expect(new Set(createdIds)).toHaveProperty("size", 100);
  });

  it("classifies an elapsed request as a timeout", async () => {
    const fetcher = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const client = createTanaMcpClient({
      token: "secret",
      workspaceId: "workspace",
      fetch: fetcher,
      timeoutMs: 5,
    });

    await expect(client.listTools()).rejects.toMatchObject({ kind: "timeout" });
  });

  it("classifies an unavailable Tana Desktop without exposing transport details", async () => {
    const client = createTanaMcpClient({
      token: "secret",
      workspaceId: "workspace",
      fetch: async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:8262");
      },
    });

    await expect(client.listTools()).rejects.toMatchObject({
      kind: "not-running",
      message: "Tana Desktop is not reachable at localhost:8262",
    });
  });

  it("opens a node through the documented Local REST fallback", async () => {
    let requestUrl: string | undefined;
    let requestInit: RequestInit | undefined;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return jsonResponse({ nodeId: "node", name: "Node", openType: "panel", message: "Opened" });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await client.openNode("node/with slash", "panel");
    expect(requestUrl).toBe("http://127.0.0.1:8262/nodes/node%2Fwith%20slash/open");
    expect(requestInit?.body).toBe('{"openType":"panel"}');
  });

  it("moves a node through the documented Local REST fallback", async () => {
    let requestUrl: string | undefined;
    let requestInit: RequestInit | undefined;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return jsonResponse({ nodeId: "node", targetNodeId: "target", message: "Moved" });
    });
    const client = createTanaMcpClient({ token: "secret", workspaceId: "workspace", fetch: fetcher });

    await client.moveNode("node", "target", { position: "start" });
    expect(requestUrl).toBe("http://127.0.0.1:8262/nodes/node/move");
    expect(requestInit?.body).toBe('{"targetNodeId":"target","position":"start"}');
  });
});
