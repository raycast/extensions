import { describe, expect, it, vi } from "vitest";
import { TanaMcpClient } from "./TanaAPIClient";
import { compareCapabilities, requireTools } from "./capabilities";

describe("Tana capability compatibility", () => {
  it("allows additional server tools while reporting required omissions", () => {
    expect(compareCapabilities(["read_node", "future_tool"], ["read_node", "search_nodes"])).toEqual({
      available: ["future_tool", "read_node"],
      missing: ["search_nodes"],
    });
  });

  it("blocks a command when its required tools are unavailable", async () => {
    const client = { listTools: vi.fn().mockResolvedValue([{ name: "read_node" }]) } as unknown as TanaMcpClient;
    await expect(requireTools(client, ["read_node", "search_nodes"])).rejects.toMatchObject({
      kind: "tool",
      message: expect.stringContaining("search_nodes"),
    });
  });
});
