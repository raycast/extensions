import { describe, expect, it, vi } from "vitest";
import { McpToolResult, TanaTool, TanaToolArguments } from "./contracts";
import { TanaMcpClient } from "./TanaAPIClient";
import {
  getCalendarNodeId,
  getLocalDateString,
  getChildren,
  listTags,
  listWorkspaces,
  readNode,
  searchNodes,
  editNode,
  addFieldToTag,
  configureTagCheckbox,
  createTag,
  getTagSchema,
  isDescendant,
  moveNodeSafely,
  setNodeDone,
  updateFieldContent,
  updateFieldOption,
  updateNodeTags,
  trashNode,
} from "./tanaService";

const textResult = (value: unknown): McpToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const clientWith = (result: McpToolResult) => {
  const callTool = vi.fn(async <Name extends TanaTool>(name: Name, args: TanaToolArguments[Name]) => {
    void name;
    void args;
    return result;
  });
  return { client: { callTool } as unknown as TanaMcpClient, callTool };
};

describe("Tana task services", () => {
  it("discovers workspaces and tags from service data", async () => {
    const workspaces = clientWith(textResult({ workspaces: [{ id: "workspace", name: "Main" }] }));
    const tags = clientWith(textResult({ tags: [{ id: "tag", name: "Project" }] }));

    await expect(listWorkspaces(workspaces.client)).resolves.toEqual([{ id: "workspace", name: "Main" }]);
    await expect(listTags(tags.client, "workspace")).resolves.toEqual([{ id: "tag", name: "Project" }]);
    expect(tags.callTool).toHaveBeenCalledWith("list_tags", { workspaceId: "workspace" });
  });

  it("gets a day node using an explicit workspace and date", async () => {
    const calendar = clientWith(textResult({ nodeId: "today" }));

    await expect(getCalendarNodeId(calendar.client, "workspace", "2026-06-22")).resolves.toBe("today");
    expect(calendar.callTool).toHaveBeenCalledWith(
      "get_or_create_calendar_node",
      {
        workspaceId: "workspace",
        date: "2026-06-22",
        granularity: "day",
      },
      undefined,
    );
  });

  it("uses the local calendar date instead of UTC for Today", () => {
    expect(getLocalDateString(new Date(2026, 5, 23, 0, 30))).toBe("2026-06-23");
  });

  it("searches within one workspace using a structured query", async () => {
    const search = clientWith(
      textResult([
        {
          id: "node",
          name: "Result",
          breadcrumb: ["Home"],
          tags: [],
          tagIds: [],
          workspaceId: "workspace",
          inTrash: false,
        },
      ]),
    );

    await expect(searchNodes(search.client, " Result ", "workspace")).resolves.toHaveLength(1);
    expect(search.callTool).toHaveBeenCalledWith(
      "search_nodes",
      {
        query: { textContains: "Result", inWorkspace: "workspace" },
        workspaceIds: ["workspace"],
        limit: 50,
      },
      undefined,
    );
  });

  it("reads nodes and paginated children", async () => {
    const reader = clientWith(textResult({ markdown: "- Node", name: "Node" }));
    const children = clientWith(textResult({ children: [], total: 0, hasMore: false }));

    await expect(readNode(reader.client, "node")).resolves.toMatchObject({ markdown: "- Node" });
    await expect(getChildren(children.client, "node", 100, 25)).resolves.toEqual({
      children: [],
      total: 0,
      hasMore: false,
    });
    expect(children.callTool).toHaveBeenCalledWith(
      "get_children",
      { nodeId: "node", offset: 100, limit: 25 },
      undefined,
    );
  });

  it("accepts the Markdown text returned by the local read_node tool", async () => {
    const reader = clientWith({ content: [{ type: "text", text: "- Node <!-- node-id: node -->\n" }] });

    await expect(readNode(reader.client, "node")).resolves.toEqual({
      markdown: "- Node <!-- node-id: node -->\n",
    });
  });

  it("accepts the Markdown text returned by the local get_tag_schema tool", async () => {
    const schema = clientWith({ content: [{ type: "text", text: "# Tag definition: Project" }] });

    await expect(getTagSchema(schema.client, "tag")).resolves.toEqual({ markdown: "# Tag definition: Project" });
  });

  it("maps low-risk mutations to explicit MCP arguments", async () => {
    const mutation = clientWith(textResult({ message: "ok" }));

    await setNodeDone(mutation.client, "node", true);
    await setNodeDone(mutation.client, "node", false);
    await updateNodeTags(mutation.client, "node", ["tag"], "add");
    await updateFieldContent(mutation.client, "node", "field", null);
    await updateFieldOption(mutation.client, "node", "field", "option", "append");

    expect(mutation.callTool.mock.calls).toEqual([
      ["check_node", { nodeId: "node" }, undefined],
      ["uncheck_node", { nodeId: "node" }, undefined],
      ["tag", { nodeId: "node", tagIds: ["tag"], action: "add" }, undefined],
      ["set_field_content", { nodeId: "node", attributeId: "field", content: null, mode: "replace" }, undefined],
      ["set_field_option", { nodeId: "node", attributeId: "field", optionId: "option", mode: "append" }, undefined],
    ]);
  });

  it("maps edit and trash mutations", async () => {
    const mutation = clientWith(textResult({ message: "ok" }));
    await editNode(mutation.client, "node", {
      name: { from: "Old", to: "Renamed" },
      description: { from: "Old description", to: null },
    });
    await trashNode(mutation.client, "node");
    expect(mutation.callTool.mock.calls).toEqual([
      [
        "edit_node",
        {
          nodeId: "node",
          name: { old_string: "Old", new_string: "Renamed", replace_all: true },
          description: { old_string: "Old description", new_string: "", replace_all: true },
        },
        undefined,
      ],
      ["trash_node", { nodeId: "node" }, undefined],
    ]);
  });

  it("recursively detects descendant move targets and blocks cycles", async () => {
    const callTool = vi.fn(async (name: TanaTool, args: TanaToolArguments[TanaTool]) => {
      if (name !== "get_children" || !("nodeId" in args)) return textResult({ message: "ok" });
      const children = args.nodeId === "root" ? [{ id: "child", name: "Child" }] : [];
      return textResult({ children, total: children.length, hasMore: false });
    });
    const moveNode = vi.fn(async () => undefined);
    const client = { callTool, moveNode } as unknown as TanaMcpClient;

    await expect(isDescendant(client, "root", "child")).resolves.toBe(true);
    await expect(moveNodeSafely(client, "root", "root")).rejects.toThrow("itself");
    await expect(moveNodeSafely(client, "root", "child")).rejects.toThrow("descendants");
    expect(moveNode).not.toHaveBeenCalled();
  });

  it("moves a node after recursive cycle validation", async () => {
    const callTool = vi.fn(async () => textResult({ children: [], total: 0, hasMore: false }));
    const moveNode = vi.fn(async () => undefined);
    const client = { callTool, moveNode } as unknown as TanaMcpClient;

    await moveNodeSafely(client, "node", "target", "start");
    expect(moveNode).toHaveBeenCalledWith("node", "target", { position: "start" }, undefined);
  });

  it("reads and mutates Supertag schemas", async () => {
    const schema = clientWith(textResult({ markdown: "# Project" }));
    const created = clientWith(textResult({ tagId: "tag", tagName: "Project" }));
    const field = clientWith(textResult({ tagId: "tag", fieldId: "field", fieldName: "Status", dataType: "options" }));
    const checkbox = clientWith(textResult({ tagId: "tag", showCheckbox: true }));

    await expect(getTagSchema(schema.client, "tag")).resolves.toEqual({ markdown: "# Project" });
    await expect(createTag(created.client, "workspace", { name: "Project" })).resolves.toMatchObject({
      tagId: "tag",
    });
    await expect(
      addFieldToTag(field.client, "tag", { name: "Status", dataType: "options", options: ["Open", "Done"] }),
    ).resolves.toMatchObject({ content: expect.any(Array) });
    await expect(configureTagCheckbox(checkbox.client, "tag", true)).resolves.toMatchObject({
      content: expect.any(Array),
    });
  });

  it("confirms a created Supertag by reading tags when the mutation returns text", async () => {
    const callTool = vi.fn(async (name: TanaTool) =>
      name === "create_tag"
        ? { content: [{ type: "text" as const, text: "Supertag created" }] }
        : textResult({ tags: [{ id: "created-tag", name: "Project" }] }),
    );
    const client = { callTool } as unknown as TanaMcpClient;

    await expect(createTag(client, "workspace", { name: "Project" })).resolves.toEqual({
      tagId: "created-tag",
      tagName: "Project",
    });
  });
});
