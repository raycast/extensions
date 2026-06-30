import { describe, expect, it, vi, beforeEach } from "vitest";
import { MobbinMcpClient } from "../lib/mcp-client";
import type { SearchOptions } from "../lib/types";

const mcpMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn(),
  finishAuth: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: mcpMocks.connect,
    listTools: vi.fn(),
    callTool: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(() => ({
    close: mcpMocks.close,
    finishAuth: mcpMocks.finishAuth,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

const options: SearchOptions = {
  query: "login screen",
  platform: "ios",
  mode: "deep",
  image_quality: "optimized",
  limit: 20,
  exclude_screen_ids: [],
};

describe("MobbinMcpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies non-auth connection failures as MCP errors", async () => {
    mcpMocks.connect.mockRejectedValueOnce(new Error("connect ETIMEDOUT"));

    await expect(
      new MobbinMcpClient({} as never).searchScreens(options),
    ).rejects.toMatchObject({
      code: "mcp-error",
      message: "connect ETIMEDOUT",
    });
  });
});
