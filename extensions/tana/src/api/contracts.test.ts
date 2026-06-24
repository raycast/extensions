import { describe, expect, it } from "vitest";
import {
  CORE_MCP_TOOLS,
  HealthSchema,
  ImportResultSchema,
  McpToolResultSchema,
  NodeSummarySchema,
  OPTIONAL_MCP_TOOLS,
  parseToolResultData,
  WorkspaceSchema,
  WorkspacesResultSchema,
} from "./contracts";

describe("Tana Local API contracts", () => {
  it("tracks the 18 documented MCP tools and 2 optional runtime tools", () => {
    expect(CORE_MCP_TOOLS).toHaveLength(18);
    expect(OPTIONAL_MCP_TOOLS).toEqual(["open_node", "move_node"]);
    expect(new Set([...CORE_MCP_TOOLS, ...OPTIONAL_MCP_TOOLS]).size).toBe(20);
  });

  it("parses the local health response", () => {
    expect(
      HealthSchema.parse({ status: "ok", timestamp: "2026-06-22T00:00:00.000Z", nodeSpaceReady: true }),
    ).toMatchObject({ status: "ok", nodeSpaceReady: true });
    expect(() => HealthSchema.parse({ status: "ok" })).toThrow();
  });

  it("requires stable service identifiers", () => {
    expect(WorkspaceSchema.parse({ id: "workspace", name: "Main" }).id).toBe("workspace");
    expect(() => WorkspaceSchema.parse({ name: "Main" })).toThrow();
    expect(NodeSummarySchema.parse({ nodeId: "node", name: null }).nodeId).toBe("node");
    expect(() => NodeSummarySchema.parse({ name: "orphan" })).toThrow("Node response has no ID");
  });

  it("preserves MCP text and structured content", () => {
    const result = McpToolResultSchema.parse({
      content: [{ type: "text", text: '{"createdNodes":[{"nodeId":"new-node"}]}' }],
      structuredContent: { createdNodes: [{ nodeId: "new-node" }] },
    });

    expect(result.content[0]).toMatchObject({ type: "text" });
    expect(ImportResultSchema.parse(result.structuredContent).createdNodes[0]?.nodeId).toBe("new-node");
  });

  it("decodes structured and text tool data", () => {
    expect(
      parseToolResultData(
        McpToolResultSchema.parse({ structuredContent: { workspaces: [{ id: "main" }] } }),
        WorkspacesResultSchema,
      ),
    ).toEqual([{ id: "main" }]);
    expect(
      parseToolResultData(
        McpToolResultSchema.parse({ content: [{ type: "text", text: '[{"id":"secondary"}]' }] }),
        WorkspacesResultSchema,
      ),
    ).toEqual([{ id: "secondary" }]);
  });
});
