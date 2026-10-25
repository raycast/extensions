import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, CallToolResult, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it } from "vitest";
import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  DashboardIconsClient,
  MCP_URL,
  McpToolError,
  parseSearchResults,
  RateLimitError,
  toolPayload,
} from "../src/lib/mcp";
import { RequestBudget } from "../src/lib/rate-limit";
import { iconNotFound, iconPortabase, searchEmpty, searchGithub, searchNtfy } from "./fixtures";

type Call = { name: string; arguments: Record<string, unknown> };
type Handler = (call: Call) => CallToolResult;

/** Starts an in-process MCP server that answers tool calls with the given handler. */
function fakeServer(handler: Handler) {
  const calls: Call[] = [];
  let connections = 0;
  const client = new DashboardIconsClient(() => {
    connections++;
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = new Server({ name: "fake-dashboard-icons", version: "0.0.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const call = { name: request.params.name, arguments: request.params.arguments ?? {} };
      calls.push(call);
      return handler(call);
    });
    void server.connect(serverTransport);
    return clientTransport;
  });
  return { client, calls, connections: () => connections };
}

const ok = (payload: Record<string, unknown>): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
  structuredContent: payload,
});

let active: DashboardIconsClient | undefined;
afterEach(async () => {
  await active?.close();
  active = undefined;
});

describe("DashboardIconsClient.searchIcons", () => {
  it("calls search_icons with query and limit only", async () => {
    const { client, calls } = fakeServer(() => ok(searchNtfy));
    active = client;
    const results = await client.searchIcons("  ntfy ");
    expect(results).toEqual([
      {
        name: "ntfy",
        title: "ntfy",
        source: "native",
        previewUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/ntfy.svg",
        matchedVariant: undefined,
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("search_icons");
    expect(calls[0].arguments).toEqual({ query: "ntfy", limit: 50 });
  });

  it("passes a source filter", async () => {
    const { client, calls } = fakeServer(() => ok(searchNtfy));
    active = client;
    await client.searchIcons("ntfy", { sources: ["selfhst"], limit: 10 });
    expect(calls[0].arguments).toMatchObject({ sources: ["selfhst"], limit: 10 });
  });

  it("does not call the server for empty or one-character queries", async () => {
    const { client, calls } = fakeServer(() => ok(searchNtfy));
    active = client;
    expect(await client.searchIcons("   ")).toEqual([]);
    expect(await client.searchIcons(" n ")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("reuses one connection for several calls", async () => {
    const { client, connections } = fakeServer(() => ok(searchNtfy));
    active = client;
    await client.searchIcons("ntfy");
    await client.searchIcons("github");
    expect(connections()).toBe(1);
  });

  it("turns tool errors into McpToolError", async () => {
    const { client } = fakeServer(() => ({ content: [{ type: "text", text: "Rate limited" }], isError: true }));
    active = client;
    await expect(client.searchIcons("ntfy")).rejects.toThrow(new McpToolError("search_icons", "Rate limited"));
  });
});

describe("rate limiting", () => {
  it("uses the public endpoint", () => {
    expect(MCP_URL).toBe("https://dashboardicons.com/api/mcp/public");
  });

  it("reports HTTP 429 as RateLimitError without retrying", async () => {
    let sends = 0;
    const transport: Transport = {
      async start() {},
      async close() {},
      async send() {
        sends++;
        throw new StreamableHTTPError(429, "Too Many Requests");
      },
    };
    const client = new DashboardIconsClient(() => transport);
    await expect(client.searchIcons("ntfy")).rejects.toBeInstanceOf(RateLimitError);
    expect(sends).toBe(1);
  });
});

describe("local request budget", () => {
  it("stops sending requests once the budget is used up", async () => {
    let now = 0;
    const handler = () => ok(searchNtfy);
    const calls: Call[] = [];
    const client = new DashboardIconsClient(
      () => {
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const server = new Server({ name: "fake", version: "0.0.0" }, { capabilities: { tools: {} } });
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          calls.push({ name: request.params.name, arguments: request.params.arguments ?? {} });
          return handler();
        });
        void server.connect(serverTransport);
        return clientTransport;
      },
      new RequestBudget(2, 60_000, () => now),
    );
    active = client;

    await client.searchIcons("ntfy");
    await client.searchIcons("plex");
    await expect(client.searchIcons("jellyfin")).rejects.toBeInstanceOf(RateLimitError);
    expect(calls).toHaveLength(2);

    now = 60_000;
    await client.searchIcons("jellyfin");
    expect(calls).toHaveLength(3);
  });
});

describe("DashboardIconsClient.getIcon", () => {
  it("returns all formats and variants", async () => {
    const { client, calls } = fakeServer(() => ok(iconPortabase));
    active = client;
    const result = await client.getIcon("portabase", "native");
    expect(calls[0]).toMatchObject({ name: "get_icon", arguments: { name: "portabase", source: "native" } });
    if (!result.found) throw new Error("expected icon");
    expect(Object.keys(result.icon.urls.webp ?? {})).toEqual([
      "default",
      "light",
      "dark",
      "wordmark-light",
      "wordmark-dark",
    ]);
    expect(result.icon.pageUrl).toBe("https://dashboardicons.com/icons/portabase");
    expect(result.icon.license).toBeNull();
  });

  it("reports unknown icons with suggestions", async () => {
    const { client } = fakeServer(() => ok(iconNotFound));
    active = client;
    const result = await client.getIcon("portbase");
    if (result.found) throw new Error("expected not found");
    expect(result.didYouMean.map((item) => `${item.source}:${item.name}`)).toEqual([
      "native:portabase",
      "selfhst:portabase",
    ]);
  });
});

describe("DashboardIconsClient.findIcons", () => {
  it("returns search results without a fallback call", async () => {
    const { client, calls } = fakeServer(() => ok(searchNtfy));
    active = client;
    const found = await client.findIcons("ntfy");
    expect(found.isSuggestion).toBe(false);
    expect(found.results).toHaveLength(1);
    expect(calls.map((call) => call.name)).toEqual(["search_icons"]);
  });

  it("falls back to did-you-mean suggestions for typos", async () => {
    const { client, calls } = fakeServer((call) => ok(call.name === "search_icons" ? searchEmpty : iconNotFound));
    active = client;
    const found = await client.findIcons("portbase");
    expect(found.isSuggestion).toBe(true);
    expect(found.results.map((item) => item.name)).toEqual(["portabase", "portabase"]);
    expect(calls[1]).toMatchObject({ name: "get_icon", arguments: { name: "portbase" } });
  });

  it("skips suggestions for short queries", async () => {
    const { client, calls } = fakeServer((call) => ok(call.name === "search_icons" ? searchEmpty : iconNotFound));
    active = client;
    expect(await client.findIcons("pot")).toEqual({ results: [], isSuggestion: false });
    expect(calls.map((call) => call.name)).toEqual(["search_icons"]);
  });

  it("keeps the source filter for suggestions", async () => {
    const { client } = fakeServer((call) => ok(call.name === "search_icons" ? searchEmpty : iconNotFound));
    active = client;
    const found = await client.findIcons("portbase", { sources: ["selfhst"] });
    expect(found.results.map((item) => item.source)).toEqual(["selfhst"]);
  });

  it("uses a loosely resolved icon as suggestion", async () => {
    const { client } = fakeServer((call) => ok(call.name === "search_icons" ? searchEmpty : iconPortabase));
    active = client;
    const found = await client.findIcons("Porta Base");
    expect(found).toMatchObject({ isSuggestion: true, results: [{ name: "portabase", source: "native" }] });
  });
});

describe("parsing", () => {
  it("skips malformed search results and keeps matched variants", () => {
    const results = parseSearchResults(searchGithub);
    expect(results.map((result) => `${result.source}:${result.name}`)).toEqual([
      "native:github",
      "simpleicons:githubpages",
      "native:github",
    ]);
    expect(results[2].matchedVariant).toBe("light");
    expect(parseSearchResults(null)).toEqual([]);
  });

  it("falls back to JSON text content without structuredContent", () => {
    expect(
      toolPayload("search_icons", {
        content: [
          { type: "text", text: JSON.stringify(searchNtfy) },
          { type: "text", text: '{"conversation_id":"x"}' },
        ],
      }),
    ).toEqual(searchNtfy);
  });

  it("rejects responses without a payload", () => {
    expect(() => toolPayload("get_icon", { content: [{ type: "text", text: "not json" }] })).toThrow(McpToolError);
  });
});
