import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { buildMcpArguments, MobbinMcpClient } from "../lib/mcp-client";
import type { SearchOptions } from "../lib/types";

const mcpMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn(),
  listTools: vi.fn(),
  callTool: vi.fn(),
  transportClose: vi.fn(),
  finishAuth: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: mcpMocks.connect,
    close: mcpMocks.close,
    listTools: mcpMocks.listTools,
    callTool: mcpMocks.callTool,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(() => ({
    close: mcpMocks.transportClose,
    finishAuth: mcpMocks.finishAuth,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

const options: SearchOptions = {
  kind: "screen",
  query: "login screen",
  platform: "ios",
  mode: "standard",
  imageQuality: "optimized",
  mcpImageFormat: "webp",
  limit: 100,
  excludeScreenIds: ["screen-2"],
};

const tools = [
  {
    name: "search_screens",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        platform: { type: "string" },
        mode: { type: "string", enum: ["deep", "fast"] },
        limit: { type: "number", minimum: 1, maximum: 30 },
        image_format: { type: "string", enum: ["webp", "jpg"] },
        exclude_screen_ids: { type: "array" },
      },
    },
  },
  {
    name: "search_flows",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { maximum: 10 } },
    },
  },
  {
    name: "search_sections",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
    },
  },
];

describe("buildMcpArguments", () => {
  it("uses advertised fields, maps standard to fast, and clamps limits", () => {
    expect(buildMcpArguments(options, tools[0]!.inputSchema)).toEqual({
      query: "login screen",
      platform: "ios",
      mode: "fast",
      limit: 30,
      image_format: "webp",
      exclude_screen_ids: ["screen-2"],
    });
  });

  it("does not pass screen-only or unsupported properties", () => {
    expect(
      buildMcpArguments({ ...options, kind: "flow" }, tools[1]!.inputSchema),
    ).toEqual({ query: "login screen", limit: 10 });
  });
});

describe("MobbinMcpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mcpMocks.connect.mockResolvedValue(undefined);
    mcpMocks.close.mockResolvedValue(undefined);
    mcpMocks.transportClose.mockResolvedValue(undefined);
    mcpMocks.finishAuth.mockResolvedValue(undefined);
    mcpMocks.listTools.mockResolvedValue({ tools });
  });

  it("discovers exact capabilities and reuses the connection/tool list", async () => {
    const client = new MobbinMcpClient({} as never);
    await expect(client.getCapabilities()).resolves.toEqual({
      screen: true,
      flow: true,
      section: true,
    });
    await client.getCapabilities();
    expect(mcpMocks.connect).toHaveBeenCalledTimes(1);
    expect(mcpMocks.listTools).toHaveBeenCalledTimes(1);
  });

  it("calls the exact screen tool with cancellation and normalizes structured content", async () => {
    mcpMocks.callTool.mockResolvedValue({
      structuredContent: {
        screens: [
          {
            id: "screen-1",
            image_url: "https://example.com/screen.webp",
            mobbin_url: "https://mobbin.com/screen-1",
            app_name: "Example",
          },
        ],
      },
      content: [],
    });
    const controller = new AbortController();
    const results = await new MobbinMcpClient({} as never).search(
      options,
      controller.signal,
    );

    expect(results[0]).toMatchObject({ kind: "screen", id: "screen-1" });
    expect(mcpMocks.callTool).toHaveBeenCalledWith(
      {
        name: "search_screens",
        arguments: expect.objectContaining({ mode: "fast", limit: 30 }),
      },
      undefined,
      { signal: expect.any(AbortSignal) },
    );
  });

  it("normalizes exact flow and section tool results", async () => {
    mcpMocks.callTool
      .mockResolvedValueOnce({
        structuredContent: {
          flows: [
            {
              id: "flow-1",
              name: "Checkout",
              app_name: "Example",
              mobbin_url: "https://mobbin.com/flow-1",
              screens: [
                {
                  id: "step-1",
                  image_url: "https://example.com/step.webp",
                },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              sections: [
                {
                  id: "section-1",
                  title: "Pricing",
                  website_name: "Example",
                  mobbin_url: "https://mobbin.com/section-1",
                  image_url: "https://example.com/section.webp",
                },
              ],
            }),
          },
        ],
      });
    const client = new MobbinMcpClient({} as never);
    await expect(client.search({ ...options, kind: "flow" })).resolves.toEqual([
      expect.objectContaining({
        kind: "flow",
        screens: [expect.objectContaining({ id: "step-1" })],
      }),
    ]);
    await expect(
      client.search({ ...options, kind: "section" }),
    ).resolves.toEqual([
      expect.objectContaining({ kind: "section", id: "section-1" }),
    ]);
    expect(mcpMocks.callTool.mock.calls[0]?.[0]).toMatchObject({
      name: "search_flows",
      arguments: { query: "login screen", limit: 10 },
    });
    expect(mcpMocks.callTool.mock.calls[1]?.[0]).toMatchObject({
      name: "search_sections",
      arguments: { query: "login screen" },
    });
  });

  it("does not fall back to another query-shaped tool", async () => {
    mcpMocks.listTools.mockResolvedValueOnce({ tools: [tools[1]] });
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).rejects.toMatchObject({ code: "mcp-tool-not-found" });
  });

  it("surfaces tool errors and contract mismatches", async () => {
    mcpMocks.callTool.mockResolvedValueOnce({
      isError: true,
      content: [{ type: "text", text: "input rejected" }],
    });
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).rejects.toMatchObject({ code: "mcp-error" });

    mcpMocks.callTool.mockResolvedValueOnce({
      structuredContent: { screens: [{ id: "incomplete" }] },
      content: [],
    });
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).rejects.toMatchObject({ code: "contract-mismatch" });
  });

  it("rejects an exact tool with an incompatible advertised schema", async () => {
    mcpMocks.listTools.mockResolvedValueOnce({
      tools: [{ name: "search_screens", inputSchema: { properties: {} } }],
    });
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).rejects.toMatchObject({ code: "contract-mismatch" });
    expect(mcpMocks.callTool).not.toHaveBeenCalled();
  });

  it("reconnects once, rediscovers tools, and retries a transport failure", async () => {
    mcpMocks.callTool
      .mockRejectedValueOnce(new Error("transport closed"))
      .mockResolvedValueOnce({
        structuredContent: { screens: [] },
      });
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).resolves.toEqual([]);
    expect(mcpMocks.connect).toHaveBeenCalledTimes(2);
    expect(mcpMocks.listTools).toHaveBeenCalledTimes(2);
    expect(mcpMocks.callTool).toHaveBeenCalledTimes(2);
  });

  it("retries MCP rate limits, including Retry-After zero", async () => {
    vi.useFakeTimers();
    const rateLimit = Object.assign(new Error("Too many requests"), {
      response: new Response(undefined, {
        status: 429,
        headers: { "Retry-After": "0" },
      }),
    });
    mcpMocks.callTool.mockRejectedValueOnce(rateLimit).mockResolvedValueOnce({
      structuredContent: { screens: [] },
    });
    const pending = new MobbinMcpClient({} as never).search(options);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual([]);
    expect(mcpMocks.callTool).toHaveBeenCalledTimes(2);
    expect(mcpMocks.connect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("completes OAuth authorization and closes partial transports", async () => {
    mcpMocks.connect
      .mockRejectedValueOnce(new UnauthorizedError())
      .mockResolvedValueOnce(undefined);
    mcpMocks.callTool.mockResolvedValueOnce({
      structuredContent: { screens: [] },
    });
    const provider = {
      takeAuthorizationCode: vi.fn(() => "authorization-code"),
    };
    await expect(
      new MobbinMcpClient(provider as never).search(options),
    ).resolves.toEqual([]);
    expect(mcpMocks.finishAuth).toHaveBeenCalledWith("authorization-code");
    expect(mcpMocks.transportClose).toHaveBeenCalled();
    expect(mcpMocks.close).toHaveBeenCalled();
  });

  it("cleans up when OAuth completion has no code or fails", async () => {
    mcpMocks.connect.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      new MobbinMcpClient({
        takeAuthorizationCode: () => undefined,
      } as never).search(options),
    ).rejects.toMatchObject({ code: "oauth-required" });
    expect(mcpMocks.close).toHaveBeenCalled();
    expect(mcpMocks.transportClose).toHaveBeenCalled();

    vi.clearAllMocks();
    mcpMocks.connect.mockRejectedValueOnce(new UnauthorizedError());
    mcpMocks.finishAuth.mockRejectedValueOnce(
      new Error("authorization exchange failed"),
    );
    await expect(
      new MobbinMcpClient({
        takeAuthorizationCode: () => "code",
      } as never).search(options),
    ).rejects.toMatchObject({
      code: "mcp-error",
      message: "authorization exchange failed",
    });
    expect(mcpMocks.close).toHaveBeenCalled();
    expect(mcpMocks.transportClose).toHaveBeenCalled();
  });

  it("reconnects capability discovery once after a stale catalog transport", async () => {
    mcpMocks.listTools
      .mockRejectedValueOnce(new Error("stale session"))
      .mockResolvedValueOnce({ tools });
    await expect(
      new MobbinMcpClient({} as never).getCapabilities(),
    ).resolves.toEqual({ screen: true, flow: true, section: true });
    expect(mcpMocks.connect).toHaveBeenCalledTimes(2);
  });

  it("classifies non-auth connection failures and cleans up", async () => {
    mcpMocks.connect.mockRejectedValueOnce(new Error("connect ETIMEDOUT"));
    await expect(
      new MobbinMcpClient({} as never).search(options),
    ).rejects.toMatchObject({
      code: "mcp-error",
      message: "connect ETIMEDOUT",
    });
    expect(mcpMocks.transportClose).toHaveBeenCalled();
  });

  it("closes the client and transport on dispose", async () => {
    const client = new MobbinMcpClient({} as never);
    await client.connect();
    await client.dispose();
    expect(mcpMocks.close).toHaveBeenCalled();
    expect(mcpMocks.transportClose).toHaveBeenCalled();
  });

  it("closes a connection that completes after disposal", async () => {
    let finishConnect: (() => void) | undefined;
    mcpMocks.connect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishConnect = resolve;
        }),
    );
    const client = new MobbinMcpClient({} as never);
    const pending = client.connect().catch((error: unknown) => error);
    await client.dispose();
    finishConnect?.();
    await expect(pending).resolves.toMatchObject({
      name: "AbortError",
    });
    expect(mcpMocks.close).toHaveBeenCalled();
    expect(mcpMocks.transportClose).toHaveBeenCalled();
  });
});
