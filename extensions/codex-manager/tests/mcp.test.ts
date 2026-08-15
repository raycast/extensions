import { describe, expect, it } from "vitest";
import { buildDuplicateName, deleteMcpServer, getMcpServers, upsertMcpServer } from "@/lib/mcp";

describe("mcp helpers", () => {
  it("builds a unique duplicate name", () => {
    const name = buildDuplicateName(["alpha", "alpha-copy", "alpha-copy-2"], "alpha");
    expect(name).toBe("alpha-copy-3");
  });

  it("upserts into mcp_servers by default", () => {
    const doc: Record<string, unknown> = {};
    upsertMcpServer(doc, "playwright", { command: "npx" });
    const servers = getMcpServers(doc);
    expect(servers.playwright.command).toBe("npx");
  });

  it("deletes an existing server", () => {
    const doc: Record<string, unknown> = { mcp_servers: { alpha: { command: "npx" } } };
    const deleted = deleteMcpServer(doc, "alpha");
    expect(deleted).toBe(true);
    expect((doc.mcp_servers as Record<string, unknown>).alpha).toBeUndefined();
  });
});
